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
