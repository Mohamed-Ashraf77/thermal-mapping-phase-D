import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_COMPLEXITY_RE,
  SESSION_DURATION_MS,
} from '../types/user';
import type { Session, User } from '../types/user';
import { createId } from '../utils/id';

// ── Password hashing (SHA-256 via Web Crypto — no external deps) ─────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// ── Password policy ───────────────────────────────────────────────────────

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`At least ${PASSWORD_MIN_LENGTH} characters required.`);
  }
  if (!PASSWORD_COMPLEXITY_RE.test(password)) {
    errors.push('Must contain uppercase, lowercase, and a number.');
  }
  return { valid: errors.length === 0, errors };
}

// ── Session management ────────────────────────────────────────────────────

const SESSION_KEY = 'thermal-mapping-session-v1';

export function createSession(user: User): Session {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_MS);
  return {
    id: createId('session'),
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    startedAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}

export function saveSession(session: Session): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* non-fatal */ }
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* non-fatal */ }
}

export function refreshSession(session: Session): Session {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_MS);
  return {
    ...session,
    lastActivityAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}

export function isSessionExpired(session: Session): boolean {
  return new Date(session.expiresAt) < new Date();
}

export function sessionRemainingMs(session: Session): number {
  return Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
}
