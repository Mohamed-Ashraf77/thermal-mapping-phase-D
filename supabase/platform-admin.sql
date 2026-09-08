create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create policy "Platform admins can view their own access"
  on public.platform_admins for select
  using (user_id = auth.uid());

-- Add the platform owner after creating the account:
-- insert into public.platform_admins (user_id)
-- values ('YOUR_PLATFORM_OWNER_USER_ID')
-- on conflict do nothing;

-- After adding the platform owner, grant that account owner access to all
-- existing organizations so they appear in the organization switcher:
-- insert into public.organization_members (organization_id, user_id, role)
-- select o.id, pa.user_id, 'owner'
-- from public.organizations o
-- cross join public.platform_admins pa
-- on conflict (organization_id, user_id) do update set role = 'owner';
