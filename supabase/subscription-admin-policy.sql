-- Run once in Supabase SQL Editor for an existing installation.
create policy "Admins can manage their subscription"
  on public.subscriptions for update
  using (public.has_organization_role(organization_id, array['owner', 'admin']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin']));
