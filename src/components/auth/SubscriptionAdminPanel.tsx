import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../store/AuthContext';

type Subscription = {
  plan_name: string;
  operation_limit: number;
  operations_used: number;
  starts_at: string;
  expires_at: string;
  status: 'trialing' | 'active' | 'expired' | 'suspended';
};

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';

function toDateInputValue(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export function SubscriptionAdminPanel() {
  const { session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [form, setForm] = useState({
    plan_name: '',
    operation_limit: '',
    starts_at: '',
    expires_at: '',
    status: 'active' as Subscription['status'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = session?.organizationRole === 'owner' || session?.organizationRole === 'admin';

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.organizationId || !canManage) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getSupabaseClient()
      .from('subscriptions')
      .select('plan_name, operation_limit, operations_used, starts_at, expires_at, status')
      .eq('organization_id', session.organizationId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) {
          setError(loadError.message);
        } else if (data) {
          const next = data as Subscription;
          setSubscription(next);
          setForm({
            plan_name: next.plan_name,
            operation_limit: String(next.operation_limit),
            starts_at: toDateInputValue(next.starts_at),
            expires_at: toDateInputValue(next.expires_at),
            status: next.status,
          });
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [canManage, session?.organizationId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.organizationId) return;
    const limit = Number(form.operation_limit);
    if (!form.plan_name.trim() || !Number.isInteger(limit) || limit < 0 || !form.starts_at || !form.expires_at) {
      setError('Enter a plan name, a non-negative whole-number limit, and both dates.');
      return;
    }
    if (new Date(form.expires_at) <= new Date(form.starts_at)) {
      setError('The expiry date must be after the start date.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const { data, error: saveError } = await getSupabaseClient()
      .from('subscriptions')
      .update({
        plan_name: form.plan_name.trim(),
        operation_limit: limit,
        starts_at: new Date(`${form.starts_at}T00:00:00`).toISOString(),
        expires_at: new Date(`${form.expires_at}T23:59:59`).toISOString(),
        status: form.status,
      })
      .eq('organization_id', session.organizationId)
      .select('plan_name, operation_limit, operations_used, starts_at, expires_at, status')
      .single();
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSubscription(data as Subscription);
    setMessage('Subscription updated successfully.');
  }

  if (!canManage) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Only organization owners and administrators can manage subscriptions.</div>;
  }
  if (!isSupabaseConfigured) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Subscription management requires Supabase mode.</div>;
  }
  if (loading) {
    return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading subscription...</div>;
  }
  if (!subscription) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">No subscription was found for this organization.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Administration</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900">
          <CreditCard className="h-5 w-5 text-slate-500" /> Subscription Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">{session.organizationName}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Plan name<input className={inputClassName + ' mt-1'} value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} /></label>
          <label className="text-xs font-bold text-slate-600">Operation limit<input type="number" min="0" step="1" className={inputClassName + ' mt-1'} value={form.operation_limit} onChange={(e) => setForm({ ...form, operation_limit: e.target.value })} /></label>
          <label className="text-xs font-bold text-slate-600">Starts on<input type="date" className={inputClassName + ' mt-1'} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
          <label className="text-xs font-bold text-slate-600">Expires on<input type="date" className={inputClassName + ' mt-1'} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></label>
          <label className="text-xs font-bold text-slate-600">Status<select className={inputClassName + ' mt-1'} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Subscription['status'] })}><option value="trialing">Trialing</option><option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option></select></label>
        </div>
        <p className="text-xs text-slate-500">Used operations: <strong>{subscription.operations_used}</strong> of {subscription.operation_limit}. Updating the limit does not reset usage.</p>
        {error && <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />{error}</p>}
        {message && <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{message}</p>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save subscription
        </button>
      </form>
    </div>
  );
}
