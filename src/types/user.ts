// ---------------------------------------------------------------------------
// User & Authentication types (Phase A — 21 CFR Part 11 compliant)
// ---------------------------------------------------------------------------

export type UserRole = 'system_admin' | 'qa_manager' | 'validation_engineer' | 'reviewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  system_admin: 'System Administrator',
  qa_manager: 'QA Manager',
  validation_engineer: 'Validation Engineer',
  reviewer: 'Reviewer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  system_admin: 'Full system access — user management, audit trail, all documents.',
  qa_manager: 'Approve & lock documents, final verdicts, read all records.',
  validation_engineer: 'Create & edit protocols and reports, upload data.',
  reviewer: 'Read-only access — cannot create or modify any record.',
};

/** Permissions map — what each role can do */
export const ROLE_PERMISSIONS: Record<UserRole, {
  manageUsers: boolean;
  createDocument: boolean;
  editDocument: boolean;
  deleteDocument: boolean;
  approveDocument: boolean;
  lockDocument: boolean;
  unlockDocument: boolean;
  viewAuditTrail: boolean;
  exportAuditTrail: boolean;
}> = {
  system_admin: {
    manageUsers: true, createDocument: true, editDocument: true,
    deleteDocument: true, approveDocument: true, lockDocument: true,
    unlockDocument: true, viewAuditTrail: true, exportAuditTrail: true,
  },
  qa_manager: {
    manageUsers: false, createDocument: false, editDocument: false,
    deleteDocument: false, approveDocument: true, lockDocument: true,
    unlockDocument: false, viewAuditTrail: true, exportAuditTrail: true,
  },
  validation_engineer: {
    manageUsers: false, createDocument: true, editDocument: true,
    deleteDocument: false, approveDocument: false, lockDocument: false,
    unlockDocument: false, viewAuditTrail: false, exportAuditTrail: false,
  },
  reviewer: {
    manageUsers: false, createDocument: false, editDocument: false,
    deleteDocument: false, approveDocument: false, lockDocument: false,
    unlockDocument: false, viewAuditTrail: false, exportAuditTrail: false,
  },
};

export interface User {
  id: string;
  username: string;          // unique, immutable once created
  displayName: string;
  email: string;
  role: UserRole;
  passwordHash: string;      // SHA-256 hex of password
  isActive: boolean;
  createdAt: string;         // ISO
  createdBy: string;         // userId who created
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null; // ISO — account locked until this time
  mustChangePassword: boolean; // force change on next login
}

export interface Session {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  startedAt: string;         // ISO
  lastActivityAt: string;    // ISO — updated on every action
  expiresAt: string;         // ISO — startedAt + SESSION_DURATION_MS
}

// ── Policy constants ──────────────────────────────────────────────────────

/** Session idle timeout: 30 minutes (21 CFR Part 11 requirement) */
export const SESSION_DURATION_MS = 30 * 60 * 1000;

/** Account locks for 15 minutes after this many consecutive failures */
export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Password minimum length */
export const PASSWORD_MIN_LENGTH = 8;

/** Regex for password complexity: upper + lower + digit */
export const PASSWORD_COMPLEXITY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/** Default System Admin created on first launch */
export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'Admin@1234'; // must change on first login
