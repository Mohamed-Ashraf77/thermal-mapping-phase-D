import { useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';

export function PlatformCompanyAdminPanel() {
  const [form, setForm] = useState({
    name: '', slug: '', ownerEmail: '', ownerDisplayName: '', ownerPassword: '',
    planName: 'Trial', operationLimit: '100', startsAt: new Date().toISOString().slice(0, 10),
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'trialing',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(null); setError(null);
    const { data, error: invokeError } = await getSupabaseClient().functions.invoke('create-organization', {
      body: { ...form, operationLimit: Number(form.operationLimit) },
    });
    setSaving(false);
    if (invokeError) { setError(invokeError.message); return; }
    setMessage(`Company "${data.organization.name}" was created successfully.`);
    setForm((current) => ({ ...current, name: '', slug: '', ownerEmail: '', ownerDisplayName: '', ownerPassword: '' }));
  }

  if (!isSupabaseConfigured) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Company administration requires Supabase mode.</div>;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Platform Administration</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900"><Building2 className="h-5 w-5 text-slate-500" /> Create New Company</h1>
        <p className="mt-1 text-sm text-slate-500">Create the company, its initial administrator account, and subscription in one secure operation.</p>
      </div>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Company name<input required className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Company slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={inputClass} placeholder="acme-pharma" value={form.slug} onChange={(e) => update('slug', e.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Admin full name<input required className={inputClass} value={form.ownerDisplayName} onChange={(e) => update('ownerDisplayName', e.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Admin email<input required type="email" className={inputClass} value={form.ownerEmail} onChange={(e) => update('ownerEmail', e.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Temporary password<input required minLength={8} type="password" className={inputClass} value={form.ownerPassword} onChange={(e) => update('ownerPassword', e.target.value)} /></label>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Initial subscription</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-slate-600">Plan<input required className={inputClass} value={form.planName} onChange={(e) => update('planName', e.target.value)} /></label>
            <label className="text-xs font-bold text-slate-600">Operation limit<input required min="0" type="number" className={inputClass} value={form.operationLimit} onChange={(e) => update('operationLimit', e.target.value)} /></label>
            <label className="text-xs font-bold text-slate-600">Starts on<input required type="date" className={inputClass} value={form.startsAt} onChange={(e) => update('startsAt', e.target.value)} /></label>
            <label className="text-xs font-bold text-slate-600">Expires on<input required type="date" className={inputClass} value={form.expiresAt} onChange={(e) => update('expiresAt', e.target.value)} /></label>
          </div>
        </div>
        {error && <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />{error}</p>}
        {message && <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{message}</p>}
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create company</button>
      </form>
    </div>
  );
}
