-- Run once in Supabase SQL Editor for an existing installation.
drop policy if exists "Admins can manage their subscription" on public.subscriptions;
drop policy if exists "Owners can manage their subscription" on public.subscriptions;
create policy "Owners can manage their subscription"
  on public.subscriptions for update
  using (public.has_organization_role(organization_id, array['owner']))
  with check (public.has_organization_role(organization_id, array['owner']));
