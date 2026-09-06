// ---------------------------------------------------------------------------
// Audit Trail types — Phase B (21 CFR Part 11 §11.10(e), §11.50)
//
// Every action that changes system state, touches a record, or relates to
// access control MUST produce an AuditEntry. Entries are append-only:
// no update, no delete — ever.
// ---------------------------------------------------------------------------

// ── Action catalog ────────────────────────────────────────────────────────

/** Authentication & access-control events */
export type AuthAction =
  | 'USER_LOGIN_SUCCESS'
  | 'USER_LOGIN_FAILED'
  | 'USER_LOGOUT'
  | 'SESSION_EXPIRED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_BY_ADMIN';

/** User-management events (System Admin only) */
export type UserMgmtAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'USER_ACTIVATED'
  | 'USER_ROLE_CHANGED';

/** Document lifecycle events */
export type DocumentAction =
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_OPENED'
  | 'DOCUMENT_DELETED'
  | 'DOCUMENT_DUPLICATED'
  | 'DOCUMENT_CONVERTED'
  | 'DOCUMENT_IMPORTED_FROM_PROTOCOL';

/** Field-level data changes */
export type DataAction =
  | 'FIELD_MODIFIED'
  | 'LOADING_CSV_IMPORTED'
  | 'SENSOR_CSV_UPLOADED'
  | 'SENSOR_CSV_REMOVED'
  | 'SENSOR_CSV_CLEARED'
  | 'CERTIFICATE_UPLOADED'
  | 'PHOTO_ADDED'
  | 'PHOTO_REMOVED'
  | 'DATALOGGER_PLACED'
  | 'DATALOGGER_REMOVED';

/** Approval & signature events — highest priority for 21 CFR Part 11 */
export type ApprovalAction =
  | 'APPROVAL_SIGNATURE_APPLIED'
  | 'FINAL_VERDICT_SET'
  | 'DOCUMENT_LOCKED'
  | 'DOCUMENT_UNLOCKED'
  | 'DOCUMENT_SUBMITTED_FOR_REVIEW'
  | 'ADDENDUM_CREATED';

/** Output / export events */
export type OutputAction =
  | 'PDF_GENERATED'
  | 'RAW_CSV_EXPORTED'
  | 'AUDIT_TRAIL_EXPORTED';

/** System-level events */
export type SystemAction =
  | 'SYSTEM_STARTUP'
  | 'SYSTEM_RESET';

export type AuditAction =
  | AuthAction
  | UserMgmtAction
  | DocumentAction
  | DataAction
  | ApprovalAction
  | OutputAction
  | SystemAction;

// ── Human-readable labels ─────────────────────────────────────────────────

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  // Auth
  USER_LOGIN_SUCCESS: 'Login successful',
  USER_LOGIN_FAILED: 'Login failed',
  USER_LOGOUT: 'Logged out',
  SESSION_EXPIRED: 'Session expired (auto-logout)',
  ACCOUNT_LOCKED: 'Account locked',
  ACCOUNT_UNLOCKED: 'Account unlocked by admin',
  PASSWORD_CHANGED: 'Password changed',
  PASSWORD_RESET_BY_ADMIN: 'Password reset by administrator',
  // User mgmt
  USER_CREATED: 'User account created',
  USER_UPDATED: 'User account updated',
  USER_DEACTIVATED: 'User account deactivated',
  USER_ACTIVATED: 'User account activated',
  USER_ROLE_CHANGED: 'User role changed',
  // Document lifecycle
  DOCUMENT_CREATED: 'Document created',
  DOCUMENT_OPENED: 'Document opened',
  DOCUMENT_DELETED: 'Document deleted',
  DOCUMENT_DUPLICATED: 'Document duplicated',
  DOCUMENT_CONVERTED: 'Document type converted',
  DOCUMENT_IMPORTED_FROM_PROTOCOL: 'Data imported from protocol',
  // Data changes
  FIELD_MODIFIED: 'Field value modified',
  LOADING_CSV_IMPORTED: 'Loading description CSV imported',
  SENSOR_CSV_UPLOADED: 'Sensor CSV file(s) uploaded',
  SENSOR_CSV_REMOVED: 'Sensor CSV file removed',
  SENSOR_CSV_CLEARED: 'All sensor CSV files cleared',
  CERTIFICATE_UPLOADED: 'Calibration certificate uploaded',
  PHOTO_ADDED: 'Chamber photo added',
  PHOTO_REMOVED: 'Chamber photo removed',
  DATALOGGER_PLACED: 'Datalogger marker placed on layout',
  DATALOGGER_REMOVED: 'Datalogger marker removed from layout',
  // Approvals
  APPROVAL_SIGNATURE_APPLIED: 'Approval signature applied',
  FINAL_VERDICT_SET: 'Final verdict set',
  DOCUMENT_LOCKED: 'Document locked (approved)',
  DOCUMENT_UNLOCKED: 'Document unlocked',
  DOCUMENT_SUBMITTED_FOR_REVIEW: 'Document submitted for review',
  ADDENDUM_CREATED: 'Addendum created',
  // Output
  PDF_GENERATED: 'PDF report generated',
  RAW_CSV_EXPORTED: 'Raw data CSV exported',
  AUDIT_TRAIL_EXPORTED: 'Audit trail exported',
  // System
  SYSTEM_STARTUP: 'System started',
  SYSTEM_RESET: 'System data reset',
};

// ── Severity / category for UI filtering ─────────────────────────────────

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low';

export const AUDIT_ACTION_SEVERITY: Record<AuditAction, AuditSeverity> = {
  USER_LOGIN_FAILED: 'high',
  ACCOUNT_LOCKED: 'critical',
  ACCOUNT_UNLOCKED: 'high',
  DOCUMENT_LOCKED: 'critical',
  DOCUMENT_UNLOCKED: 'critical',
  APPROVAL_SIGNATURE_APPLIED: 'critical',
  FINAL_VERDICT_SET: 'critical',
  ADDENDUM_CREATED: 'critical',
  USER_CREATED: 'high',
  USER_DEACTIVATED: 'high',
  USER_ACTIVATED: 'high',
  USER_ROLE_CHANGED: 'high',
  PASSWORD_RESET_BY_ADMIN: 'high',
  USER_LOGIN_SUCCESS: 'medium',
  USER_LOGOUT: 'low',
  SESSION_EXPIRED: 'medium',
  PASSWORD_CHANGED: 'medium',
  USER_UPDATED: 'medium',
  DOCUMENT_CREATED: 'medium',
  DOCUMENT_DELETED: 'high',
  DOCUMENT_DUPLICATED: 'medium',
  DOCUMENT_CONVERTED: 'medium',
  DOCUMENT_OPENED: 'low',
  DOCUMENT_IMPORTED_FROM_PROTOCOL: 'medium',
  DOCUMENT_SUBMITTED_FOR_REVIEW: 'high',
  FIELD_MODIFIED: 'low',
  LOADING_CSV_IMPORTED: 'medium',
  SENSOR_CSV_UPLOADED: 'medium',
  SENSOR_CSV_REMOVED: 'medium',
  SENSOR_CSV_CLEARED: 'high',
  CERTIFICATE_UPLOADED: 'medium',
  PHOTO_ADDED: 'low',
  PHOTO_REMOVED: 'low',
  DATALOGGER_PLACED: 'low',
  DATALOGGER_REMOVED: 'low',
  PDF_GENERATED: 'medium',
  RAW_CSV_EXPORTED: 'medium',
  AUDIT_TRAIL_EXPORTED: 'high',
  SYSTEM_STARTUP: 'low',
  SYSTEM_RESET: 'critical',
};

// ── The immutable audit record ────────────────────────────────────────────

export interface AuditEntry {
  /** Unique, monotonically-increasing ID (uuid-style). */
  id: string;

  /** ISO 8601 timestamp — set server-side (from Date.now()) so it can't be
   *  spoofed by a manipulated client clock. */
  timestamp: string;

  /** Epoch ms version of timestamp for fast range queries. */
  timestampMs: number;

  /** The acting user — 'system' for boot/auto events. */
  userId: string;
  username: string;
  userDisplayName: string;
  userRole: string;

  /** Session that was active when the event occurred. */
  sessionId: string;

  action: AuditAction;
  severity: AuditSeverity;

  /** Document this event relates to, if any. */
  documentId: string | null;
  documentNumber: string | null;
  documentType: string | null;

  /** For FIELD_MODIFIED — human-readable path. */
  fieldPath: string | null;

  /** Before/after values — trimmed to 500 chars each. */
  oldValue: string | null;
  newValue: string | null;

  /** Free-text detail (file name, reason, error message, etc.). */
  detail: string | null;

  /** Whether the action completed successfully. */
  outcome: 'success' | 'failure';

  /** If outcome === 'failure', the error/reason. */
  failureReason: string | null;
}
