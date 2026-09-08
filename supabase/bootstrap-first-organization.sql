-- Run once after creating the first user in Supabase Auth.
-- Replace the email value before running.

do $$
declare
  target_user_id uuid;
  target_organization_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where email = 'mo@mo.mo';

  if target_user_id is null then
    raise exception 'No Supabase Auth user found for the supplied email.';
  end if;

  insert into public.organizations (name, slug)
  values ('My Company', 'my-company')
  returning id into target_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (target_organization_id, target_user_id, 'owner');

  insert into public.subscriptions (
    organization_id,
    plan_name,
    operation_limit,
    starts_at,
    expires_at,
    status
  )
  values (
    target_organization_id,
    'Pilot',
    100,
    now(),
    now() + interval '30 days',
    'trialing'
  );
end $$;
