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
  const { data: access, error: accessError } = await admin.from('platform_admins')
    .select('user_id').eq('user_id', caller.user.id).maybeSingle();
  if (accessError) return reply({ error: accessError.message }, 500);
  if (!access) return reply({ error: 'Only platform administrators can manage companies.' }, 403);

  const body = await request.json();
  if (body.action === 'list') {
    const { data, error } = await admin.from('organizations')
      .select('id, name, slug, is_active, created_at, subscriptions(plan_name, operation_limit, operations_used, starts_at, expires_at, status)')
      .order('created_at', { ascending: false });
    if (error) return reply({ error: error.message }, 500);
    return reply({ companies: data ?? [] });
  }

  if (body.action !== 'update' || !body.organizationId) {
    return reply({ error: 'Invalid company operation.' }, 400);
  }
  const organizationId = String(body.organizationId);
  const organizationPatch: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) organizationPatch.name = body.name.trim();
  if (typeof body.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug.trim().toLowerCase())) {
    organizationPatch.slug = body.slug.trim().toLowerCase();
  }
  if (typeof body.isActive === 'boolean') organizationPatch.is_active = body.isActive;
  if (Object.keys(organizationPatch).length) {
    const { error } = await admin.from('organizations').update(organizationPatch).eq('id', organizationId);
    if (error) return reply({ error: error.message }, 400);
  }

  const subscriptionPatch: Record<string, unknown> = {};
  if (typeof body.planName === 'string' && body.planName.trim()) subscriptionPatch.plan_name = body.planName.trim();
  if (Number.isInteger(body.operationLimit) && body.operationLimit >= 0) subscriptionPatch.operation_limit = body.operationLimit;
  if (typeof body.startsAt === 'string') subscriptionPatch.starts_at = new Date(body.startsAt).toISOString();
  if (typeof body.expiresAt === 'string') subscriptionPatch.expires_at = new Date(body.expiresAt).toISOString();
  if (['trialing', 'active', 'expired', 'suspended'].includes(body.status)) subscriptionPatch.status = body.status;
  if (Object.keys(subscriptionPatch).length) {
    const { error } = await admin.from('subscriptions').update(subscriptionPatch).eq('organization_id', organizationId);
    if (error) return reply({ error: error.message }, 400);
  }
  return reply({ ok: true });
});
