import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Loader2, Lock, AlertTriangle, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { validatePassword } from '../../lib/authUtils';
import { isSupabaseConfigured } from '../../lib/supabase';
import { DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } from '../../types/user';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';

// ── Change-password dialog (shown on first login or mustChangePassword) ────

function ChangePasswordDialog({ onDone }: { onDone: () => void }) {
  const { changeOwnPassword, logout } = useAuth();
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { valid, errors } = validatePassword(newPass);
    if (!valid) { setError(errors.join(' ')); return; }
    if (newPass !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await changeOwnPassword(newPass);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Password Change Required</h2>
            <p className="text-[11px] text-slate-400">21 CFR Part 11 — initial credential policy</p>
          </div>
        </div>
        <p className="mb-4 text-xs text-slate-600">
          Your account requires a new password before continuing. The new password must be at
          least 8 characters and contain uppercase, lowercase, and a number.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              placeholder="New password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className={inputCls}
              autoFocus
            />
            <button type="button" onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
          />
          {error && (
            <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={logout}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
              Sign out
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-60">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Set Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main login screen ─────────────────────────────────────────────────────

export function LoginScreen() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockCountdown, setLockCountdown] = useState(0);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  function startLockCountdown(lockedUntil: string) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    function tick() {
      const remaining = Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining === 0 && countdownRef.current) clearInterval(countdownRef.current);
    }
    tick();
    countdownRef.current = setInterval(tick, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.ok) {
        if (result.mustChangePassword) setMustChangePassword(true);
      } else {
        if (result.reason === 'account_locked') {
          if (result.lockedUntil) startLockCountdown(result.lockedUntil);
          setError('Account is temporarily locked due to too many failed attempts.');
        } else if (result.reason === 'account_inactive') {
          setError(isSupabaseConfigured
            ? 'Your account is not assigned to an organization yet. Contact your administrator.'
            : 'Your account has been deactivated. Contact your System Administrator.');
        } else {
          setError('Invalid username or password.');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setPassword('');
    }
  }

  return (
    <>
      {mustChangePassword && <ChangePasswordDialog onDone={() => setMustChangePassword(false)} />}

      <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        {/* Card */}
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <img
              src="/assets/thermal-validation-studio-logo.png"
              alt="Thermal Validation Studio"
              className="h-auto w-full max-w-[18rem] object-contain"
            />
            <div className="text-center">
              <p className="text-xs font-medium text-slate-400">GxP Document Management System</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-700">Sign in to your account</h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder={isSupabaseConfigured ? 'Email address' : 'Username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className={inputCls}
              />
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-rose-700">{error}</p>
                    {lockCountdown > 0 && (
                      <p className="mt-0.5 text-[11px] font-bold text-rose-600 font-mono">
                        Unlocks in {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, '0')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || lockCountdown > 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign In
              </button>
            </form>
          </div>

          {/* 21 CFR Part 11 notice */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-center text-[10px] text-slate-500 leading-relaxed">
              This system is regulated under{' '}
              <span className="font-bold text-slate-700">21 CFR Part 11</span> and{' '}
              <span className="font-bold text-slate-700">FDA Data Integrity</span> guidelines.
              All activities are recorded in a tamper-evident audit trail.
              Unauthorized access is prohibited and may be subject to legal action.
            </p>
          </div>

          {/* First-launch hint */}
          <p className="mt-3 text-center text-[10px] text-slate-400">
            First launch? Sign in with{' '}
            <span className="font-mono font-bold text-slate-600">{DEFAULT_ADMIN_USERNAME}</span>
            {' '}/ <span className="font-mono font-bold text-slate-600">{DEFAULT_ADMIN_PASSWORD}</span>
          </p>
          <p className="mt-4 text-center text-[10px] font-medium text-slate-400">
            Developed by Mohamed Ashraf
          </p>
        </div>
      </div>
    </>
  );
}
