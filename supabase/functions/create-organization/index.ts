import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !serviceRoleKey || !token) return reply({ error: 'Unauthorized.' }, 401);

  const admin = createClient(url, serviceRoleKey);
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) return reply({ error: 'Unauthorized.' }, 401);

  const { data: platformAdmin, error: accessError } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', caller.user.id)
    .maybeSingle();
  if (accessError) return reply({ error: accessError.message }, 500);
  if (!platformAdmin) return reply({ error: 'Only platform administrators can create companies.' }, 403);

  const body = await request.json();
  const name = String(body.name ?? '').trim();
  const slug = String(body.slug ?? '').trim().toLowerCase();
  const email = String(body.ownerEmail ?? '').trim().toLowerCase();
  const displayName = String(body.ownerDisplayName ?? '').trim();
  const password = String(body.ownerPassword ?? '');
  const planName = String(body.planName ?? '').trim();
  const operationLimit = Number(body.operationLimit);
  const startsAt = new Date(String(body.startsAt));
  const expiresAt = new Date(String(body.expiresAt));
  const status = String(body.status ?? 'trialing');

  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !email || !displayName || password.length < 8 ||
      !planName || !Number.isInteger(operationLimit) || operationLimit < 0 ||
      Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= startsAt ||
      !['trialing', 'active'].includes(status)) {
    return reply({ error: 'Invalid company, owner, or subscription details.' }, 400);
  }

  const { data: organization, error: organizationError } = await admin
    .from('organizations')
    .insert({ name, slug })
    .select('id, name, slug')
    .single();
  if (organizationError || !organization) return reply({ error: organizationError?.message ?? 'Could not create company.' }, 400);

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (userError || !created.user) {
    await admin.from('organizations').delete().eq('id', organization.id);
    return reply({ error: userError?.message ?? 'Could not create owner.' }, 400);
  }

  const ownerMembership = await admin.from('organization_members').insert({
    organization_id: organization.id, user_id: caller.user.id, role: 'owner',
  });
  const ownerProfile = await admin.from('organization_user_profiles').upsert({
    organization_id: organization.id,
    user_id: caller.user.id,
    email: caller.user.email ?? '',
    display_name: caller.user.user_metadata?.display_name ?? caller.user.email ?? 'Platform Owner',
    role: 'owner',
  });
  const membership = await admin.from('organization_members').insert({
    organization_id: organization.id, user_id: created.user.id, role: 'admin',
  });
  const profile = await admin.from('organization_user_profiles').insert({
    organization_id: organization.id, user_id: created.user.id, email, display_name: displayName, role: 'admin',
  });
  const subscription = await admin.from('subscriptions').insert({
    organization_id: organization.id, plan_name: planName, operation_limit: operationLimit,
    starts_at: startsAt.toISOString(), expires_at: expiresAt.toISOString(),
    status,
  });

  if (ownerMembership.error || ownerProfile.error || membership.error || profile.error || subscription.error) {
    await admin.from('organization_members').delete().eq('organization_id', organization.id).eq('user_id', caller.user.id);
    await admin.from('organization_user_profiles').delete().eq('organization_id', organization.id).eq('user_id', caller.user.id);
    await admin.from('organization_members').delete().eq('organization_id', organization.id);
    await admin.from('organization_user_profiles').delete().eq('organization_id', organization.id);
    await admin.from('subscriptions').delete().eq('organization_id', organization.id);
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from('organizations').delete().eq('id', organization.id);
    return reply({ error: membership.error?.message ?? profile.error?.message ?? subscription.error?.message ?? 'Could not finish company setup.' }, 400);
  }

  return reply({ organization, admin: { id: created.user.id, email }, subscription: { planName, operationLimit } });
});
