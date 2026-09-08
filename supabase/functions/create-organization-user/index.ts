import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !serviceRoleKey || !authorization) return response({ error: 'Unauthorized.' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: callerData, error: callerError } = await adminClient.auth.getUser(token);
  if (callerError || !callerData.user) return response({ error: 'Unauthorized.' }, 401);

  const body = await request.json();
  const { organizationId, email, displayName, password } = body;
  const appRole = body.role;
  const roleMap: Record<string, string> = {
    system_admin: 'admin',
    qa_manager: 'admin',
    validation_engineer: 'editor',
    reviewer: 'reviewer',
  };
  const role = roleMap[appRole] ?? (['admin', 'editor', 'reviewer', 'viewer'].includes(appRole) ? appRole : null);
  if (!organizationId || !email || !displayName || !password || !role) {
    return response({ error: 'Invalid user details.' }, 400);
  }

  const { data: membership, error: membershipError } = await adminClient
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', callerData.user.id)
    .maybeSingle();
  if (membershipError) return response({ error: membershipError.message }, 500);
  if (!membership || !['owner', 'admin'].includes(membership.role)) return response({ error: 'Insufficient permissions.' }, 403);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { display_name: String(displayName).trim() },
  });
  if (createError || !created.user) return response({ error: createError?.message ?? 'Could not create user.' }, 400);

  const { error: linkError } = await adminClient.from('organization_members').insert({
    organization_id: organizationId,
    user_id: created.user.id,
    role,
  });
  if (linkError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return response({ error: linkError.message }, 400);
  }
  const { error: profileError } = await adminClient.from('organization_user_profiles').insert({
    organization_id: organizationId,
    user_id: created.user.id,
    email: created.user.email,
    display_name: String(displayName).trim(),
    role,
  });
  if (profileError) {
    await adminClient.from('organization_members').delete().eq('organization_id', organizationId).eq('user_id', created.user.id);
    await adminClient.auth.admin.deleteUser(created.user.id);
    return response({ error: profileError.message }, 400);
  }

  return response({
    user: {
      id: created.user.id,
      email: created.user.email,
      displayName: created.user.user_metadata?.display_name ?? displayName,
    },
  });
});
