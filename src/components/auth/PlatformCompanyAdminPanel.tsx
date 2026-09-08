import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Edit3, Loader2, Plus, RefreshCw } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

type Company = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  subscriptions: Array<{
    plan_name: string;
    operation_limit: number;
    operations_used: number;
    starts_at: string;
    expires_at: string;
    status: string;
  }> | null;
};

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';

function dateValue(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

const emptyForm = {
  name: '', slug: '', ownerEmail: '', ownerDisplayName: '', ownerPassword: '',
  planName: 'Trial', operationLimit: '100',
  startsAt: new Date().toISOString().slice(0, 10),
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  status: 'trialing',
};

export function PlatformCompanyAdminPanel() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ name: '', slug: '', planName: '', operationLimit: '', startsAt: '', expiresAt: '', status: 'active', isActive: true });
  const [showCreate, setShowCreate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    const { data, error: invokeError } = await getSupabaseClient().functions.invoke('manage-platform-company', { body: { action: 'list' } });
    setLoading(false);
    if (invokeError) { setError(invokeError.message); return; }
    setCompanies((data.companies ?? []) as Company[]);
  }, []);

  useEffect(() => { void loadCompanies(); }, [loadCompanies]);

  function updateCreate(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createCompany(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(null); setError(null);
    const { data, error: invokeError } = await getSupabaseClient().functions.invoke('create-organization', {
      body: { ...form, operationLimit: Number(form.operationLimit) },
    });
    setSaving(false);
    if (invokeError) { setError(invokeError.message); return; }
    setMessage(`Company "${data.organization.name}" was created successfully.`);
    setForm(emptyForm);
    await loadCompanies();
  }

  function startEdit(company: Company) {
    const subscription = company.subscriptions?.[0];
    setSelected(company);
    setEditForm({
      name: company.name, slug: company.slug, planName: subscription?.plan_name ?? '',
      operationLimit: String(subscription?.operation_limit ?? 0),
      startsAt: dateValue(subscription?.starts_at ?? ''),
      expiresAt: dateValue(subscription?.expires_at ?? ''),
      status: subscription?.status ?? 'active', isActive: company.is_active,
    });
    setShowCreate(false);
    setError(null);
  }

  async function saveCompany(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true); setMessage(null); setError(null);
    const { error: invokeError } = await getSupabaseClient().functions.invoke('manage-platform-company', {
      body: { action: 'update', organizationId: selected.id, ...editForm, operationLimit: Number(editForm.operationLimit) },
    });
    setSaving(false);
    if (invokeError) { setError(invokeError.message); return; }
    setMessage(`Company "${editForm.name}" was updated.`);
    await loadCompanies();
  }

  if (!isSupabaseConfigured) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Company administration requires Supabase mode.</div>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Platform Administration</p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900"><Building2 className="h-5 w-5 text-slate-500" /> Company Management</h1>
          <p className="mt-1 text-sm text-slate-500">View companies, manage subscriptions, and create new company administrator accounts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowCreate(true); setSelected(null); }} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> New company</button>
          <button onClick={() => void loadCompanies()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
        </div>
      </div>

      {error && <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />{error}</p>}
      {message && <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{message}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Existing companies</h2>
        {loading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div> : (
          <div className="divide-y divide-slate-100">
            {companies.map((company) => {
              const subscription = company.subscriptions?.[0];
              return <div key={company.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-bold text-slate-800">{company.name}</p><p className="text-[11px] text-slate-400">{company.slug} · {subscription?.plan_name ?? 'No subscription'}</p></div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500"><span>{subscription?.operations_used ?? 0}/{subscription?.operation_limit ?? 0} operations</span><span className={company.is_active ? 'text-emerald-600' : 'text-rose-600'}>{company.is_active ? 'Active' : 'Inactive'}</span><button onClick={() => startEdit(company)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-600"><Edit3 className="h-3 w-3" /> Edit</button></div>
              </div>;
            })}
            {!companies.length && <p className="py-3 text-sm text-slate-500">No companies found.</p>}
          </div>
        )}
      </section>

      {(showCreate || selected) && <form onSubmit={selected ? saveCompany : createCompany} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800">{selected ? `Edit ${selected.name}` : 'Create New Company'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Company name<input required className={inputClass} value={selected ? editForm.name : form.name} onChange={(e) => selected ? setEditForm({ ...editForm, name: e.target.value }) : updateCreate('name', e.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Company slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={inputClass} value={selected ? editForm.slug : form.slug} onChange={(e) => selected ? setEditForm({ ...editForm, slug: e.target.value }) : updateCreate('slug', e.target.value)} /></label>
          {!selected && <><label className="text-xs font-bold text-slate-600">Admin full name<input required className={inputClass} value={form.ownerDisplayName} onChange={(e) => updateCreate('ownerDisplayName', e.target.value)} /></label><label className="text-xs font-bold text-slate-600">Admin email<input required type="email" className={inputClass} value={form.ownerEmail} onChange={(e) => updateCreate('ownerEmail', e.target.value)} /></label><label className="text-xs font-bold text-slate-600">Temporary password<input required minLength={8} type="password" className={inputClass} value={form.ownerPassword} onChange={(e) => updateCreate('ownerPassword', e.target.value)} /></label></>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Plan<input required className={inputClass} value={selected ? editForm.planName : form.planName} onChange={(e) => selected ? setEditForm({ ...editForm, planName: e.target.value }) : updateCreate('planName', e.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Operation limit<input required min="0" type="number" className={inputClass} value={selected ? editForm.operationLimit : form.operationLimit} onChange={(e) => selected ? setEditForm({ ...editForm, operationLimit: e.target.value }) : updateCreate('operationLimit', e.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Starts on<input required type="date" className={inputClass} value={selected ? editForm.startsAt : form.startsAt} onChange={(e) => selected ? setEditForm({ ...editForm, startsAt: e.target.value }) : updateCreate('startsAt', e.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Expires on<input required type="date" className={inputClass} value={selected ? editForm.expiresAt : form.expiresAt} onChange={(e) => selected ? setEditForm({ ...editForm, expiresAt: e.target.value }) : updateCreate('expiresAt', e.target.value)} /></label>
        </div>
        {selected && <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} /> Company active</label>}
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{selected ? 'Save changes' : 'Create company'}</button>
      </form>}
    </div>
  );
}
