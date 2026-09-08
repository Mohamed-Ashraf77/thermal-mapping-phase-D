import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Session, User, UserRole } from '../types/user';
import { ROLE_PERMISSIONS, MAX_LOGIN_ATTEMPTS, SESSION_DURATION_MS } from '../types/user';
import { logEvent } from '../lib/auditStore';
import {
  createSession,
  saveSession,
  loadSession,
  clearSession,
  refreshSession,
  isSessionExpired,
} from '../lib/authUtils';
import {
  getUserByUsername,
  recordLoginSuccess,
  recordLoginFailure,
  seedDefaultAdminIfNeeded,
  getAllUsers,
  createUser as createUserInDb,
  updateUser,
  changePassword,
} from '../lib/userStore';
import { verifyPassword } from '../lib/authUtils';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

function getCloudRole(role: unknown): UserRole {
  if (role === 'owner' || role === 'admin') return 'system_admin';
  if (role === 'editor') return 'validation_engineer';
  return 'reviewer';
}

export interface CloudMembership {
  organizationId: string;
  organizationName: string;
  role: string;
}

async function getCloudMemberships(userId: string): Promise<CloudMembership[]> {
  const { data, error } = await getSupabaseClient()
    .from('organization_members')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).flatMap((membership) => {
    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations;
    return organization?.name
      ? [{ organizationId: membership.organization_id, organizationName: organization.name, role: membership.role }]
      : [];
  });
}

function createCloudSession(user: User, membership: CloudMembership): Session {
  const now = new Date().toISOString();
  return {
    id: user.id,
    userId: user.id,
    username: user.email,
    displayName: user.displayName,
    role: user.role,
    startedAt: now,
    lastActivityAt: now,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    organizationRole: membership.role,
  };
}

export type LoginResult =
  | { ok: true; mustChangePassword: boolean }
  | { ok: false; reason: 'invalid_credentials' | 'account_locked' | 'account_inactive'; lockedUntil?: string };

interface AuthContextValue {
  /** null while the initial session check is running */
  session: Session | null;
  /** true until the initial session + seed check finishes */
  initialising: boolean;
  /** seconds remaining in the current session (counts down) */
  sessionSecondsRemaining: number;
  organizations: CloudMembership[];
  switchOrganization: (organizationId: string) => void;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  /** Change the currently signed-in user's own password */
  changeOwnPassword: (newPassword: string) => Promise<void>;
  /** Admin-only: create a new user */
  createUser: (params: Parameters<typeof createUserInDb>[0]) => Promise<User>;
  /** Admin-only: update any user's fields */
  updateUserById: (id: string, patch: Partial<Omit<User, 'id'>>) => Promise<User>;
  /** Load all users (admin panel) */
  loadAllUsers: () => Promise<User[]>;
  /** Quick permission check for the current user */
  can: (action: keyof typeof ROLE_PERMISSIONS[UserRole]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [organizations, setOrganizations] = useState<CloudMembership[]>([]);
  const [initialising, setInitialising] = useState(true);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Boot: seed default admin + restore session ───────────────────
  useEffect(() => {
    async function boot() {
      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient().auth.getSession();
        if (error) throw error;
        if (data.session?.user) {
          const memberships = await getCloudMemberships(data.session.user.id);
          const membership = memberships[0];
          if (!membership) {
            setInitialising(false);
            return;
          }
          setOrganizations(memberships);
          const cloudUser: User = {
            id: data.session.user.id,
            username: data.session.user.email ?? data.session.user.id,
            displayName: data.session.user.user_metadata.display_name
              || data.session.user.email
              || 'User',
            email: data.session.user.email ?? '',
            role: getCloudRole(membership.role),
            passwordHash: '',
            isActive: true,
            createdAt: data.session.user.created_at,
            createdBy: 'supabase',
            lastLoginAt: data.session.user.last_sign_in_at ?? null,
            failedLoginAttempts: 0,
            lockedUntil: null,
            mustChangePassword: false,
          };
          const restored = createCloudSession(cloudUser, membership);
          setSession(restored);
        }
        setInitialising(false);
        return;
      }

      await seedDefaultAdminIfNeeded();
      const saved = loadSession();
      if (saved && !isSessionExpired(saved)) {
        const refreshed = refreshSession(saved);
        saveSession(refreshed);
        setSession(refreshed);
        // Log session restored on page reload
        await logEvent({
          sessionId: refreshed.id,
          userId: refreshed.userId,
          username: refreshed.username,
          userDisplayName: refreshed.displayName,
          userRole: refreshed.role,
          action: 'SYSTEM_STARTUP',
          detail: 'Application loaded — existing session restored',
          outcome: 'success',
        });
      } else {
        if (saved) {
          // Session was present but expired — log the expiry
          await logEvent({
            sessionId: saved.id,
            userId: saved.userId,
            username: saved.username,
            userDisplayName: saved.displayName,
            userRole: saved.role,
            action: 'SESSION_EXPIRED',
            detail: 'Session expired while application was closed',
            outcome: 'success',
          });
        } else {
          // Fresh launch with no prior session
          await logEvent({
            sessionId: 'system',
            userId: 'system',
            username: 'system',
            userDisplayName: 'System',
            userRole: '',
            action: 'SYSTEM_STARTUP',
            detail: 'Application launched — no prior session',
            outcome: 'success',
          });
        }
      }
      setInitialising(false);
    }
    boot();
  }, []);

  // ── Session countdown ticker ──────────────────────────────────────
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!session) { setSessionSecondsRemaining(0); return; }

    function tick() {
      if (!session) return;
      if (isSessionExpired(session)) {
        // Log the auto-logout before clearing
        logEvent({
          sessionId: session.id,
          userId: session.userId,
          username: session.username,
          userDisplayName: session.displayName,
          userRole: session.role,
          action: 'SESSION_EXPIRED',
          detail: 'Session timed out after 30 minutes of inactivity',
          outcome: 'success',
        });
        clearSession();
        setSession(null);
        setSessionSecondsRemaining(0);
        if (tickRef.current) clearInterval(tickRef.current);
        return;
      }
      const ms = new Date(session.expiresAt).getTime() - Date.now();
      setSessionSecondsRemaining(Math.max(0, Math.floor(ms / 1000)));
    }
    tick();
    tickRef.current = setInterval(tick, 10_000); // update every 10s
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [session]);

  // ── Refresh session on user activity ─────────────────────────────
  useEffect(() => {
    if (!session) return;
    function onActivity() {
      setSession((prev) => {
        if (!prev || isSessionExpired(prev)) return prev;
        const refreshed = refreshSession(prev);
        saveSession(refreshed);
        return refreshed;
      });
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [session]);

  // ── Auth actions ──────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email: username,
        password,
      });
      if (error || !data.user) {
        return { ok: false, reason: 'invalid_credentials' };
      }
      const memberships = await getCloudMemberships(data.user.id);
      const membership = memberships[0];
      if (!membership) {
        await getSupabaseClient().auth.signOut();
        return { ok: false, reason: 'account_inactive' };
      }
      setOrganizations(memberships);

      const cloudUser: User = {
        id: data.user.id,
        username: data.user.email ?? username,
        displayName: data.user.user_metadata.display_name || data.user.email || username,
        email: data.user.email ?? username,
        role: getCloudRole(membership.role),
        passwordHash: '',
        isActive: true,
        createdAt: data.user.created_at,
        createdBy: 'supabase',
        lastLoginAt: data.user.last_sign_in_at ?? null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
      };
      const cloudSession = createCloudSession(cloudUser, membership);
      setSession(cloudSession);
      return { ok: true, mustChangePassword: false };
    }

    const user = await getUserByUsername(username);

    if (!user) {
      // Unknown username — log with system actor (no real userId)
      await logEvent({ sessionId: 'system', userId: 'system', username: username,
        userDisplayName: username, userRole: '', action: 'USER_LOGIN_FAILED',
        detail: `Unknown username: ${username}`, outcome: 'failure',
        failureReason: 'invalid_credentials' });
      return { ok: false, reason: 'invalid_credentials' };
    }
    if (!user.isActive) {
      await logEvent({ sessionId: 'system', userId: user.id, username: user.username,
        userDisplayName: user.displayName, userRole: user.role, action: 'USER_LOGIN_FAILED',
        detail: 'Account is inactive', outcome: 'failure', failureReason: 'account_inactive' });
      return { ok: false, reason: 'account_inactive' };
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await logEvent({ sessionId: 'system', userId: user.id, username: user.username,
        userDisplayName: user.displayName, userRole: user.role, action: 'USER_LOGIN_FAILED',
        detail: `Account locked until ${user.lockedUntil}`, outcome: 'failure',
        failureReason: 'account_locked' });
      return { ok: false, reason: 'account_locked', lockedUntil: user.lockedUntil };
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      await recordLoginFailure(user.id);
      const updated = await getUserByUsername(username);
      if (updated?.lockedUntil) {
        await logEvent({ sessionId: 'system', userId: user.id, username: user.username,
          userDisplayName: user.displayName, userRole: user.role, action: 'ACCOUNT_LOCKED',
          detail: `Locked after ${MAX_LOGIN_ATTEMPTS} failed attempts`,
          outcome: 'success' });
        return { ok: false, reason: 'account_locked', lockedUntil: updated.lockedUntil };
      }
      await logEvent({ sessionId: 'system', userId: user.id, username: user.username,
        userDisplayName: user.displayName, userRole: user.role, action: 'USER_LOGIN_FAILED',
        detail: 'Incorrect password', outcome: 'failure', failureReason: 'invalid_credentials' });
      return { ok: false, reason: 'invalid_credentials' };
    }

    const updatedUser = await recordLoginSuccess(user.id);
    const newSession = createSession(updatedUser);
    saveSession(newSession);
    setSession(newSession);

    // Log success with the new session id
    await logEvent({ sessionId: newSession.id, userId: user.id, username: user.username,
      userDisplayName: user.displayName, userRole: user.role, action: 'USER_LOGIN_SUCCESS',
      detail: `Role: ${user.role}`, outcome: 'success' });

    return { ok: true, mustChangePassword: user.mustChangePassword };
  }, []);

  const logout = useCallback(() => {
    if (session) {
      logEvent({ sessionId: session.id, userId: session.userId, username: session.username,
        userDisplayName: session.displayName, userRole: session.role,
        action: 'USER_LOGOUT', detail: 'Manual sign-out', outcome: 'success' });
    }
    clearSession();
    setSession(null);
    setOrganizations([]);
    if (isSupabaseConfigured) {
      void getSupabaseClient().auth.signOut();
    }
  }, [session]);

  const switchOrganization = useCallback((organizationId: string) => {
    if (!isSupabaseConfigured) return;
    const membership = organizations.find((item) => item.organizationId === organizationId);
    if (!membership) {
      throw new Error('You are not a member of that organization.');
    }
    setSession((current) => current
      ? {
          ...current,
          organizationId: membership.organizationId,
          organizationName: membership.organizationName,
          organizationRole: membership.role,
          role: getCloudRole(membership.role),
        }
      : current);
  }, [organizations]);

  const changeOwnPassword = useCallback(async (newPassword: string) => {
    if (!session) throw new Error('Not authenticated.');
    if (isSupabaseConfigured) {
      const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
      if (error) throw error;
      return;
    }
    await changePassword(session.userId, newPassword);
    await logEvent({ sessionId: session.id, userId: session.userId, username: session.username,
      userDisplayName: session.displayName, userRole: session.role,
      action: 'PASSWORD_CHANGED', detail: 'User changed own password', outcome: 'success' });
  }, [session]);

  const createUser = useCallback(async (params: Parameters<typeof createUserInDb>[0]) => {
    if (!session) throw new Error('Not authenticated.');
    return createUserInDb(params);
  }, [session]);

  const updateUserById = useCallback(async (id: string, patch: Partial<Omit<User, 'id'>>) => {
    if (!session) throw new Error('Not authenticated.');
    return updateUser(id, patch);
  }, [session]);

  const loadAllUsers = useCallback(() => getAllUsers(), []);

  const can = useCallback((action: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean => {
    if (!session) return false;
    return ROLE_PERMISSIONS[session.role][action] ?? false;
  }, [session]);

  const value = useMemo(() => ({
    session, initialising, sessionSecondsRemaining,
    organizations, switchOrganization,
    login, logout, changeOwnPassword,
    createUser, updateUserById, loadAllUsers, can,
  }), [session, initialising, sessionSecondsRemaining, organizations, switchOrganization, login, logout, changeOwnPassword, createUser, updateUserById, loadAllUsers, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
