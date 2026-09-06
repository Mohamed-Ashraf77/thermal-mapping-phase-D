import { useState } from 'react';
import { LogOut, User, Clock, AlertTriangle, ChevronDown, Key } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { ROLE_LABELS } from '../../types/user';
import { validatePassword } from '../../lib/authUtils';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Change own password dialog ────────────────────────────────────────────
function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { changeOwnPassword } = useAuth();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { valid, errors } = validatePassword(next);
    if (!valid) { setError(errors.join(' ')); return; }
    if (next !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await changeOwnPassword(next);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Change Password</h2>
        {done ? (
          <div className="text-center py-4">
            <p className="text-sm font-bold text-emerald-700">Password changed successfully.</p>
            <button onClick={onClose}
              className="mt-4 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" placeholder="New password" value={next}
              onChange={(e) => setNext(e.target.value)} className={inputCls} autoFocus />
            <input type="password" placeholder="Confirm new password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
            <p className="text-[10px] text-slate-400">Min 8 chars — uppercase, lowercase, and a digit.</p>
            {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Change'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main SessionBar ────────────────────────────────────────────────────────
export function SessionBar() {
  const { session, logout, sessionSecondsRemaining } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  if (!session) return null;

  const isExpiringSoon = sessionSecondsRemaining > 0 && sessionSecondsRemaining < 300; // < 5 min

  return (
    <>
      {showChangePw && <ChangePasswordDialog onClose={() => setShowChangePw(false)} />}

      <div className="relative flex items-center gap-2">
        {/* Session countdown — orange when < 5 min */}
        {sessionSecondsRemaining > 0 && (
          <div className={`hidden sm:flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold font-mono transition ${
            isExpiringSoon ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {isExpiringSoon && <AlertTriangle className="h-3 w-3" />}
            <Clock className="h-3 w-3" />
            {formatCountdown(sessionSecondsRemaining)}
          </div>
        )}

        {/* User pill — click to open dropdown */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm hover:bg-slate-50 transition"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-extrabold uppercase">
            {session.displayName.charAt(0)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-[11px] font-bold text-slate-800 leading-tight">{session.displayName}</p>
            <p className="text-[9px] font-medium text-slate-400">{ROLE_LABELS[session.role]}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-40 mt-1.5 w-52 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
              {/* User info */}
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-xs font-bold text-slate-900">{session.displayName}</p>
                <p className="text-[10px] text-slate-400 font-mono">@{session.username}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                  <User className="h-2.5 w-2.5" /> {ROLE_LABELS[session.role]}
                </span>
              </div>

              {/* Actions */}
              <button
                onClick={() => { setMenuOpen(false); setShowChangePw(true); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Key className="h-3.5 w-3.5 text-slate-400" /> Change Password
              </button>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
