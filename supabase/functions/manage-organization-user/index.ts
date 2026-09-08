import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !serviceKey || !token) return reply({ error: 'Unauthorized.' }, 401);
  const client = createClient(url, serviceKey);
  const { data: caller, error: callerError } = await client.auth.getUser(token);
  if (callerError || !caller.user) return reply({ error: 'Unauthorized.' }, 401);
  const { organizationId, userId, patch } = await request.json();
  const { data: membership } = await client.from('organization_members').select('role').eq('organization_id', organizationId).eq('user_id', caller.user.id).maybeSingle();
  if (!membership || !['owner', 'admin'].includes(membership.role)) return reply({ error: 'Insufficient permissions.' }, 403);
  const { data: target } = await client.from('organization_members').select('role').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle();
  if (!target) return reply({ error: 'User not found in this organization.' }, 404);
  if (patch.role === 'system_admin' && membership.role !== 'owner') return reply({ error: 'Only the organization owner can assign administrators.' }, 403);

  const authPatch: Record<string, unknown> = {};
  if (patch.email) authPatch.email = String(patch.email).trim().toLowerCase();
  if (patch.passwordHash) authPatch.password = String(patch.passwordHash);
  if (patch.displayName) authPatch.user_metadata = { display_name: String(patch.displayName).trim() };
  if (Object.keys(authPatch).length) {
    const { error } = await client.auth.admin.updateUserById(userId, authPatch);
    if (error) return reply({ error: error.message }, 400);
  }
  const roleMap: Record<string, string> = { system_admin: 'admin', qa_manager: 'admin', validation_engineer: 'editor', reviewer: 'reviewer' };
  const profilePatch = {
    ...(patch.email ? { email: String(patch.email).trim().toLowerCase() } : {}),
    ...(patch.displayName ? { display_name: String(patch.displayName).trim() } : {}),
    ...(patch.role ? { role: roleMap[patch.role] ?? patch.role } : {}),
    ...(typeof patch.isActive === 'boolean' ? { is_active: patch.isActive } : {}),
  };
  if (Object.keys(profilePatch).length) {
    const { error } = await client.from('organization_user_profiles').update(profilePatch).eq('organization_id', organizationId).eq('user_id', userId);
    if (error) return reply({ error: error.message }, 400);
  }
  return reply({ user: { id: userId, ...patch, username: patch.email ?? '', email: patch.email ?? '', displayName: patch.displayName ?? '', passwordHash: '', createdBy: 'supabase', createdAt: new Date().toISOString(), isActive: patch.isActive ?? true, lastLoginAt: null, failedLoginAttempts: 0, lockedUntil: null, mustChangePassword: false } });
});
