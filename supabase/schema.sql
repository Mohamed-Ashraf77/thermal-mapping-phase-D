-- Thermal Validation Studio
-- Initial multi-tenant schema. Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'reviewer', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan_name text not null,
  operation_limit integer not null check (operation_limit >= 0),
  operations_used integer not null default 0 check (operations_used >= 0),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('trialing', 'active', 'expired', 'suspended')),
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('protocol', 'report')),
  status text not null default 'draft' check (status in ('draft', 'under_review', 'approved')),
  system_name text not null default '',
  document_number text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  document_id uuid references public.documents(id) on delete set null,
  detail text not null default '',
  outcome text not null default 'success' check (outcome in ('success', 'failure')),
  created_at timestamptz not null default now()
);

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);
create index if not exists documents_organization_id_idx
  on public.documents(organization_id);
create index if not exists audit_logs_organization_id_created_at_idx
  on public.audit_logs(organization_id, created_at desc);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.consume_operation(target_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_subscription public.subscriptions;
begin
  if not public.has_organization_role(target_organization_id, array['owner', 'admin', 'editor']) then
    return false;
  end if;

  select *
  into current_subscription
  from public.subscriptions
  where organization_id = target_organization_id
  for update;

  if current_subscription.status not in ('trialing', 'active')
     or current_subscription.expires_at <= now()
     or current_subscription.operations_used >= current_subscription.operation_limit then
    return false;
  end if;

  update public.subscriptions
  set operations_used = operations_used + 1
  where organization_id = target_organization_id;

  return true;
end;
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy "Members can view their organizations"
  on public.organizations for select
  using (public.is_organization_member(id));

create policy "Members can view organization membership"
  on public.organization_members for select
  using (public.is_organization_member(organization_id));

create policy "Admins can manage organization membership"
  on public.organization_members for all
  using (public.has_organization_role(organization_id, array['owner', 'admin']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin']));

create policy "Members can view their subscription"
  on public.subscriptions for select
  using (public.is_organization_member(organization_id));

create policy "Owners can manage their subscription"
  on public.subscriptions for update
  using (public.has_organization_role(organization_id, array['owner']))
  with check (public.has_organization_role(organization_id, array['owner']));

create policy "Members can view organization documents"
  on public.documents for select
  using (public.is_organization_member(organization_id));

create policy "Editors can create organization documents"
  on public.documents for insert
  with check (
    public.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
    and created_by = auth.uid()
  );

create policy "Editors can update organization documents"
  on public.documents for update
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'editor']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

create policy "Admins can delete organization documents"
  on public.documents for delete
  using (public.has_organization_role(organization_id, array['owner', 'admin']));

create policy "Members can view organization audit logs"
  on public.audit_logs for select
  using (public.is_organization_member(organization_id));

create policy "Members can create organization audit logs"
  on public.audit_logs for insert
  with check (
    public.is_organization_member(organization_id)
    and (user_id is null or user_id = auth.uid())
  );

grant execute on function public.consume_operation(uuid) to authenticated;
