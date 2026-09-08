// ---------------------------------------------------------------------------
// auditStore.ts — Append-only IndexedDB store for AuditEntry records.
//
// Design constraints:
//  • No deleteEntry / clearStore exported — immutability is enforced at the
//    module boundary, not just by convention.
//  • Writes are fire-and-forget (void return) so callers never block on I/O.
//  • Reads support cursor-based pagination + multi-field filtering so the UI
//    never loads thousands of rows at once.
// ---------------------------------------------------------------------------

import type { AuditEntry, AuditAction, AuditSeverity } from '../types/audit';
import { createId } from '../utils/id';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const DB_NAME = 'thermal-mapping-studio';
const DB_VERSION = 5;          // bump: adds organization index to audit entries
const AUDIT_STORE = 'auditTrail';
const SENSOR_STORE = 'sensorFiles';
const DOCS_STORE = 'documents';
const USERS_STORE = 'users';

type CloudAuditRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  username: string;
  user_display_name: string;
  user_role: string;
  session_id: string;
  action: AuditAction;
  severity: AuditSeverity;
  document_id: string | null;
  document_number: string | null;
  document_type: string | null;
  field_path: string | null;
  old_value: string | null;
  new_value: string | null;
  detail: string | null;
  outcome: 'success' | 'failure';
  failure_reason: string | null;
  created_at: string;
};

function fromCloudRow(row: CloudAuditRow): AuditEntry {
  const timestampMs = new Date(row.created_at).getTime();
  return {
    id: row.id,
    timestamp: row.created_at,
    timestampMs,
    userId: row.user_id ?? 'system',
    username: row.username,
    userDisplayName: row.user_display_name,
    userRole: row.user_role,
    sessionId: row.session_id,
    organizationId: row.organization_id,
    action: row.action,
    severity: row.severity,
    documentId: row.document_id,
    documentNumber: row.document_number,
    documentType: row.document_type,
    fieldPath: row.field_path,
    oldValue: row.old_value,
    newValue: row.new_value,
    detail: row.detail,
    outcome: row.outcome,
    failureReason: row.failure_reason,
  };
}

async function queryCloudAuditEntries(organizationId: string): Promise<AuditEntry[]> {
  const { data, error } = await getSupabaseClient()
    .from('audit_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as CloudAuditRow[] ?? []).map(fromCloudRow);
}

async function appendCloudAuditEntry(entry: AuditEntry): Promise<void> {
  if (!entry.organizationId || !isSupabaseConfigured) return;
  const { error } = await getSupabaseClient().from('audit_logs').insert({
    organization_id: entry.organizationId,
    user_id: entry.userId === 'system' ? null : entry.userId,
    username: entry.username,
    user_display_name: entry.userDisplayName,
    user_role: entry.userRole,
    session_id: entry.sessionId,
    action: entry.action,
    severity: entry.severity,
    document_id: entry.documentId,
    document_number: entry.documentNumber,
    document_type: entry.documentType,
    field_path: entry.fieldPath,
    old_value: entry.oldValue,
    new_value: entry.newValue,
    detail: entry.detail,
    outcome: entry.outcome,
    failure_reason: entry.failureReason,
  });
  if (error) throw error;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldV = (event as IDBVersionChangeEvent).oldVersion;

      if (!db.objectStoreNames.contains(SENSOR_STORE))
        db.createObjectStore(SENSOR_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DOCS_STORE))
        db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(USERS_STORE))
        db.createObjectStore(USERS_STORE, { keyPath: 'id' });

      if (!db.objectStoreNames.contains(AUDIT_STORE)) {
        const store = db.createObjectStore(AUDIT_STORE, { keyPath: 'id' });
        store.createIndex('byTimestamp', 'timestampMs', { unique: false });
        store.createIndex('byUser', 'userId', { unique: false });
        store.createIndex('byAction', 'action', { unique: false });
        store.createIndex('byDocument', 'documentId', { unique: false });
        store.createIndex('byOrganization', 'organizationId', { unique: false });
      } else if (oldV < 5) {
        const store = req.transaction?.objectStore(AUDIT_STORE);
        if (store && !store.indexNames.contains('byOrganization')) {
          store.createIndex('byOrganization', 'organizationId', { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Write ─────────────────────────────────────────────────────────────────

/** Appends a single entry. Fire-and-forget — never throws to the caller. */
export async function appendAuditEntry(entry: AuditEntry): Promise<void> {
  if (isSupabaseConfigured && entry.organizationId) {
    try {
      await appendCloudAuditEntry(entry);
      return;
    } catch (err) {
      console.error('[audit] Failed to write cloud entry:', err);
    }
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIT_STORE, 'readwrite');
      tx.objectStore(AUDIT_STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Audit logging must never crash the app.
    console.error('[audit] Failed to write entry:', err);
  }
}

// ── Query ─────────────────────────────────────────────────────────────────

export interface AuditFilter {
  fromMs?: number;
  toMs?: number;
  userId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  documentId?: string;
  organizationId?: string;
  searchText?: string;
  /** If true, only return entries where outcome === 'failure'. */
  failuresOnly?: boolean;
}

export interface AuditPage {
  entries: AuditEntry[];
  totalCount: number;
  hasMore: boolean;
}

/** Returns entries newest-first with optional filtering + pagination. */
export async function queryAuditEntries(
  filter: AuditFilter = {},
  page = 0,
  pageSize = 50,
): Promise<AuditPage> {
  if (isSupabaseConfigured && filter.organizationId) {
    const all = await queryCloudAuditEntries(filter.organizationId);
    const filtered = filterEntries(all, filter);
    const start = page * pageSize;
    return {
      entries: pageSize === 0 ? [] : filtered.slice(start, start + pageSize),
      totalCount: filtered.length,
      hasMore: pageSize > 0 && start + pageSize < filtered.length,
    };
  }
  const db = await openDb();
  const all = await new Promise<AuditEntry[]>((resolve, reject) => {
    const tx = db.transaction(AUDIT_STORE, 'readonly');
    const req = tx.objectStore(AUDIT_STORE).getAll();
    req.onsuccess = () => resolve((req.result as AuditEntry[]) ?? []);
    req.onerror = () => reject(req.error);
  });

  // Sort newest first
  all.sort((a, b) => b.timestampMs - a.timestampMs);

  // Apply filters
  const filtered = filterEntries(all, filter);
  const start = page * pageSize;
  return {
    entries: filtered.slice(start, start + pageSize),
    totalCount: filtered.length,
    hasMore: start + pageSize < filtered.length,
  };
}

function filterEntries(all: AuditEntry[], filter: AuditFilter): AuditEntry[] {
  return all.filter((e) => {
    if (filter.fromMs && e.timestampMs < filter.fromMs) return false;
    if (filter.toMs && e.timestampMs > filter.toMs) return false;
    if (filter.userId && e.userId !== filter.userId) return false;
    if (filter.action && e.action !== filter.action) return false;
    if (filter.severity && e.severity !== filter.severity) return false;
    if (filter.documentId && e.documentId !== filter.documentId) return false;
    if (filter.organizationId && e.organizationId !== filter.organizationId) return false;
    if (filter.failuresOnly && e.outcome !== 'failure') return false;
    if (filter.searchText) {
      const q = filter.searchText.toLowerCase();
      const haystack = [
        e.username, e.userDisplayName, e.action, e.detail,
        e.documentNumber, e.fieldPath, e.oldValue, e.newValue,
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Total count of all entries — used for the stats dashboard. */
export async function countAuditEntries(filter: AuditFilter = {}): Promise<number> {
  if (isSupabaseConfigured && filter.organizationId) {
    return (await queryCloudAuditEntries(filter.organizationId)).length;
  }
  if (Object.keys(filter).length > 0) {
    const { totalCount } = await queryAuditEntries(filter, 0, 0);
    return totalCount;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_STORE, 'readonly');
    const req = tx.objectStore(AUDIT_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── CSV Export ────────────────────────────────────────────────────────────

export async function exportAuditTrailCsv(filter: AuditFilter = {}): Promise<string> {
  const { entries } = await queryAuditEntries(filter, 0, 999999);
  const headers = [
    'Timestamp', 'User', 'Role', 'Action', 'Severity',
    'Document', 'Doc Number', 'Field', 'Old Value', 'New Value',
    'Detail', 'Outcome', 'Failure Reason', 'Session ID',
  ];
  const rows = entries.map((e) => [
    e.timestamp,
    `${e.username} (${e.userDisplayName})`,
    e.userRole,
    e.action,
    e.severity,
    e.documentId ?? '',
    e.documentNumber ?? '',
    e.fieldPath ?? '',
    e.oldValue ?? '',
    e.newValue ?? '',
    e.detail ?? '',
    e.outcome,
    e.failureReason ?? '',
    e.sessionId,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`));

  return [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

// ── Builder helper ────────────────────────────────────────────────────────

export interface LogEventParams {
  sessionId: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userRole: string;
  organizationId?: string | null;
  action: AuditEntry['action'];
  documentId?: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  fieldPath?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  detail?: string | null;
  outcome?: 'success' | 'failure';
  failureReason?: string | null;
}

/** Builds and persists a complete AuditEntry from a partial params object. */
export async function logEvent(params: LogEventParams): Promise<void> {
  const { AUDIT_ACTION_SEVERITY } = await import('../types/audit');
  const now = Date.now();
  const entry: AuditEntry = {
    id: createId('audit'),
    timestamp: new Date(now).toISOString(),
    timestampMs: now,
    userId: params.userId,
    username: params.username,
    userDisplayName: params.userDisplayName,
    userRole: params.userRole,
    sessionId: params.sessionId,
    organizationId: params.organizationId ?? null,
    action: params.action,
    severity: AUDIT_ACTION_SEVERITY[params.action] ?? 'low',
    documentId: params.documentId ?? null,
    documentNumber: params.documentNumber ?? null,
    documentType: params.documentType ?? null,
    fieldPath: params.fieldPath ?? null,
    oldValue: params.oldValue ? String(params.oldValue).slice(0, 500) : null,
    newValue: params.newValue ? String(params.newValue).slice(0, 500) : null,
    detail: params.detail ?? null,
    outcome: params.outcome ?? 'success',
    failureReason: params.failureReason ?? null,
  };
  await appendAuditEntry(entry);
}
