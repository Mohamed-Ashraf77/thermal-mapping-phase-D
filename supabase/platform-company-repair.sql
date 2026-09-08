-- Run once after deploying platform administration.
-- Grants the platform owner visibility into every company and ensures
-- company-created accounts are administrators, not owners.
insert into public.organization_members (organization_id, user_id, role)
select o.id, '38d14cb5-fd5b-462b-b8e0-f4d1628aa99c', 'owner'
from public.organizations o
on conflict (organization_id, user_id) do update set role = 'owner';

-- To repair one company administrator, replace the placeholders and run:
-- update public.organization_members
-- set role = 'admin'
-- where organization_id = 'COMPANY_ID' and user_id = 'ADMIN_USER_ID';
-- update public.organization_user_profiles
-- set role = 'admin'
-- where organization_id = 'COMPANY_ID' and user_id = 'ADMIN_USER_ID';

-- Verify subscription updates remain owner-only:
drop policy if exists "Admins can manage their subscription" on public.subscriptions;
drop policy if exists "Owners can manage their subscription" on public.subscriptions;
create policy "Owners can manage their subscription"
  on public.subscriptions for update
  using (public.has_organization_role(organization_id, array['owner']))
  with check (public.has_organization_role(organization_id, array['owner']));
