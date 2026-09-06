import { useState } from 'react';
import { Lock, ShieldCheck, X, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { getUserByUsername } from '../../lib/userStore';
import { verifyPassword } from '../../lib/authUtils';

interface SigningDialogProps {
  /** Title shown at the top — describes what is being signed. */
  title: string;
  /** One-line description of the action being authorized. */
  actionDescription: string;
  /** Called with true if the user confirmed + verified password successfully,
   *  false if they cancelled. */
  onResult: (confirmed: boolean) => void;
}

export function SigningDialog({ title, actionDescription, onResult }: SigningDialogProps) {
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [meaning, setMeaning] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!meaning.trim()) {
      setError('Please state the meaning of your electronic signature.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await getUserByUsername(session.username);
      if (!user) throw new Error('User not found.');
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        setError('Incorrect password. Your signature could not be verified.');
        setPassword('');
        return;
      }
      onResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              <p className="text-[10px] font-medium text-slate-400">
                21 CFR Part 11 — Electronic Signature
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onResult(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          {/* Action being signed */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Action being authorized
            </p>
            <p className="text-xs font-semibold text-indigo-900">{actionDescription}</p>
          </div>

          {/* Signer identity (read-only) */}
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Signing as
            </p>
            <p className="text-xs font-bold text-slate-800">{session?.displayName}</p>
            <p className="text-[10px] text-slate-500 font-mono">@{session?.username} · {session?.role}</p>
          </div>

          {/* Meaning of signature */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              Meaning of this signature <span className="text-rose-500">*</span>
            </span>
            <select
              className={inputCls}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              required
            >
              <option value="">— Select the meaning —</option>
              <option value="I approve this document">I approve this document</option>
              <option value="I have reviewed and approved the content">I have reviewed and approved the content</option>
              <option value="I confirm this document meets the acceptance criteria">I confirm this document meets the acceptance criteria</option>
              <option value="I authorize locking this document">I authorize locking this document</option>
              <option value="I authorize submitting this document for review">I authorize submitting this document for review</option>
            </select>
          </label>

          {/* Password re-entry */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              Confirm your password <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to sign"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-xs font-medium text-rose-700">{error}</p>
            </div>
          )}

          {/* 21 CFR disclaimer */}
          <p className="text-[10px] leading-relaxed text-slate-400">
            By signing, you confirm that you are the named individual and that the action described
            above is your intent. This signature is legally equivalent to a handwritten signature
            under 21 CFR Part 11 and is permanently recorded in the system audit trail.
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onResult(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password || !meaning}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {loading ? 'Verifying…' : 'Apply Electronic Signature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
