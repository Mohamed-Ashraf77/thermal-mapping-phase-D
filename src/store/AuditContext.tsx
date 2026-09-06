import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AuditAction } from '../types/audit';
import { logEvent } from '../lib/auditStore';
import { useAuth } from './AuthContext';

type LogParams = {
  action: AuditAction;
  documentId?: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  fieldPath?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  detail?: string | null;
  outcome?: 'success' | 'failure';
  failureReason?: string | null;
};

interface AuditContextValue {
  /** Log an event attributed to the currently signed-in user's session.
   *  Returns a Promise but is safe to call without await — failures are
   *  swallowed at the store level and never propagate. */
  log: (params: LogParams) => Promise<void>;
  /** True when there is an active session to attribute events to. */
  ready: boolean;
}

const AuditContext = createContext<AuditContextValue | null>(null);

export function AuditProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  const log = useCallback(async (params: LogParams): Promise<void> => {
    // If no session (boot events, login events) use 'system' as the actor.
    await logEvent({
      sessionId: session?.id ?? 'system',
      userId: session?.userId ?? 'system',
      username: session?.username ?? 'system',
      userDisplayName: session?.displayName ?? 'System',
      userRole: session?.role ?? 'system',
      ...params,
    });
  }, [session]);

  const value = useMemo(() => ({ log, ready: !!session }), [log, session]);

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAudit(): AuditContextValue {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within an AuditProvider');
  return ctx;
}
