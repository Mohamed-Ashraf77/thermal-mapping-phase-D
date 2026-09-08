import { useEffect, useState } from 'react';
import {
  Users, Plus, Edit2, Lock, Unlock, Key, X,
  CheckCircle2, AlertTriangle, Loader2, Shield,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useAudit } from '../../store/AuditContext';
import { validatePassword } from '../../lib/authUtils';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../types/user';
import type { User, UserRole } from '../../types/user';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';

const ROLES: UserRole[] = ['system_admin', 'qa_manager', 'validation_engineer', 'reviewer'];

// ── Create / Edit User Dialog ─────────────────────────────────────────────

function UserDialog({
  editUser,
  currentUserId,
  onClose,
  onSaved,
}: {
  editUser: User | null;
  currentUserId: string;
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const { session, createUser, updateUserById } = useAuth();
  const { log } = useAudit();
  const isEdit = !!editUser;

  const [form, setForm] = useState({
    username: editUser?.username ?? '',
    displayName: editUser?.displayName ?? '',
    email: editUser?.email ?? '',
    role: (editUser?.role ?? 'validation_engineer') as UserRole,
    password: '',
    confirmPassword: '',
    mustChangePassword: editUser ? editUser.mustChangePassword : true,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const availableRoles = session?.organizationRole === 'owner'
    ? ROLES
    : ROLES.filter((role) => role !== 'system_admin' && role !== 'qa_manager');

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.displayName.trim()) errs.push('Display name is required.');
    if (!form.email.trim()) errs.push('Email is required.');
    if (!isEdit) {
      if (!form.username.trim()) errs.push('Username is required.');
      if (!form.password) errs.push('Password is required.');
      const pv = validatePassword(form.password);
      if (!pv.valid) errs.push(...pv.errors);
      if (form.password !== form.confirmPassword) errs.push('Passwords do not match.');
    }
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSaving(true);
    try {
      let saved: User;
      if (isEdit) {
        const patch: Partial<User> = {
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          mustChangePassword: form.mustChangePassword,
        };
        if (session?.organizationRole === 'owner') patch.role = form.role;
        saved = await updateUserById(editUser!.id, patch);
        await log({ action: 'USER_UPDATED', detail: `Updated user: ${saved.username} (role: ${saved.role})` });
      } else {
        saved = await createUser({
          username: form.username.trim(),
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          role: form.role,
          password: form.password,
          createdBy: session!.userId,
        });
        await log({ action: 'USER_CREATED', detail: `Created user: ${saved.username} (role: ${saved.role})` });
      }
      onSaved(saved);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to save user.']);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              {isEdit ? 'Edit User' : 'Create New User'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {!isEdit && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Username *</span>
              <input className={inputCls} value={form.username} onChange={(e) => setField('username', e.target.value)} placeholder="e.g. jsmith" autoFocus />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Display Name *</span>
            <input className={inputCls} value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} placeholder="John Smith" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email *</span>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="j.smith@company.com" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</span>
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) => setField('role', e.target.value as UserRole)}
              disabled={isEdit && editUser?.id === currentUserId}
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-400">{ROLE_DESCRIPTIONS[form.role]}</p>
          </label>

          {!isEdit && (
            <>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Password *</span>
                <input type="password" className={inputCls} value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Min 8 chars, upper+lower+digit" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Confirm Password *</span>
                <input type="password" className={inputCls} value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} />
              </label>
            </>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.mustChangePassword} onChange={(e) => setField('mustChangePassword', e.target.checked)}
              className="rounded border-slate-300" />
            <span className="text-xs font-medium text-slate-700">Require password change on next login</span>
          </label>

          {errors.length > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5 space-y-0.5">
              {errors.map((e, i) => (
                <p key={i} className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-60">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset Password Dialog ─────────────────────────────────────────────────

function ResetPasswordDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { updateUserById } = useAuth();
  const { log } = useAudit();
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { valid, errors } = validatePassword(newPass);
    if (!valid) { setError(errors.join(' ')); return; }
    if (newPass !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await updateUserById(userId, {
        passwordHash: newPass,
        mustChangePassword: true,
      });
      await log({ action: 'PASSWORD_RESET_BY_ADMIN', detail: `Admin reset password for userId: ${userId}` });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Reset Password</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" className={inputCls} placeholder="New password" value={newPass} onChange={(e) => setNewPass(e.target.value)} autoFocus />
          <input type="password" className={inputCls} placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
          <p className="text-[10px] text-slate-400">User will be required to change password on next login.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-60">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────

export function UserManagementPanel() {
  const { session, loadAllUsers, updateUserById, can } = useAuth();
  const { log } = useAudit();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setUsers(await loadAllUsers());
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  async function toggleActive(user: User) {
    if (user.id === session?.userId) return;
    await updateUserById(user.id, { isActive: !user.isActive });
    await log({
      action: user.isActive ? 'USER_DEACTIVATED' : 'USER_ACTIVATED',
      detail: `${user.isActive ? 'Deactivated' : 'Activated'} user: ${user.username}`,
    });
    await reload();
  }

  async function unlockUser(user: User) {
    await updateUserById(user.id, { lockedUntil: null, failedLoginAttempts: 0 });
    await log({ action: 'ACCOUNT_UNLOCKED', detail: `Admin unlocked account: ${user.username}` });
    await reload();
  }

  if (!can('manageUsers')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <Lock className="h-12 w-12 stroke-[1] text-slate-200" />
        <p className="text-sm font-bold text-slate-600">Access Restricted</p>
        <p className="text-xs text-center max-w-xs">User Management is available to System Administrators only.</p>
      </div>
    );
  }

  return (
    <>
      {showDialog && (
        <UserDialog
          editUser={editTarget}
          currentUserId={session!.userId}
          onClose={() => { setShowDialog(false); setEditTarget(null); }}
          onSaved={async () => { setShowDialog(false); setEditTarget(null); await reload(); }}
        />
      )}
      {resetTarget && (
        <ResetPasswordDialog userId={resetTarget} onClose={async () => { setResetTarget(null); await reload(); }} />
      )}

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2"><Users className="h-5 w-5 text-slate-600" /></div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Users & Roles</h1>
              <p className="text-[11px] text-slate-400 font-medium">21 CFR Part 11 — access control and user management</p>
            </div>
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowDialog(true); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add User
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-slate-300" /></div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50">
                <tr>
                  {['User', 'Role', 'Status', 'Last Login', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => {
                  const isLocked = !!user.lockedUntil && new Date(user.lockedUntil) > new Date();
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-900">{user.displayName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{user.username}</p>
                        <p className="text-[10px] text-slate-400">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {user.isActive ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          )}
                          {user.mustChangePassword && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              <Key className="h-3 w-3" /> Must change pw
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-GB') : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditTarget(user); setShowDialog(true); }}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Edit user"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setResetTarget(user.id)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
                            title="Reset password"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>
                          {isLocked && (
                            <button
                              onClick={() => unlockUser(user)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition"
                              title="Unlock account"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {user.id !== session?.userId && (
                            <button
                              onClick={() => toggleActive(user)}
                              className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition ${
                                user.isActive
                                  ? 'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100'
                                  : 'border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
