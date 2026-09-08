-- Run once in Supabase SQL Editor for an existing installation.
create table if not exists public.organization_user_profiles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('owner', 'admin', 'editor', 'reviewer', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
alter table public.organization_user_profiles enable row level security;
create policy "Members can view organization user profiles"
  on public.organization_user_profiles for select
  using (public.is_organization_member(organization_id));
create policy "Admins can manage organization user profiles"
  on public.organization_user_profiles for all
  using (public.has_organization_role(organization_id, array['owner', 'admin']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin']));
