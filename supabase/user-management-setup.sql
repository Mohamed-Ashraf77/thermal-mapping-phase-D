-- Run once in Supabase SQL Editor before enabling in-app user creation.
-- The Edge Function uses the service role only on the server; never expose it in Vercel.
comment on table public.organization_members is
  'Tenant membership managed by the application and the create-organization-user Edge Function.';
