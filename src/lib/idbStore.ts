// ---------------------------------------------------------------------------
// Minimal IndexedDB helper, scoped to a single object store keyed by string id.
// No external dependency (idb, dexie, etc.) — just enough promisified wrapping
// to store/retrieve/delete/list JSON-serializable records.
// ---------------------------------------------------------------------------

const DB_NAME = 'thermal-mapping-studio';
const DB_VERSION = 4;
const STORE_NAME = 'sensorFiles';
const DOCS_STORE_NAME = 'documents';
const USERS_STORE_NAME = 'users';
const AUDIT_STORE_NAME = 'auditTrail';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DOCS_STORE_NAME)) {
        db.createObjectStore(DOCS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(USERS_STORE_NAME)) {
        db.createObjectStore(USERS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(AUDIT_STORE_NAME)) {
        const auditStore = db.createObjectStore(AUDIT_STORE_NAME, { keyPath: 'id' });
        auditStore.createIndex('byTimestamp', 'timestampMs', { unique: false });
        auditStore.createIndex('byUser', 'userId', { unique: false });
        auditStore.createIndex('byAction', 'action', { unique: false });
        auditStore.createIndex('byDocument', 'documentId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAll<T>(): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut<T extends { id: string }>(record: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClear(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** True if IndexedDB is usable in this context (it can throw/be undefined in
 * some locked-down or non-browser environments). */
export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

// ---------------------------------------------------------------------------
// Documents store helpers
// ---------------------------------------------------------------------------

export async function idbSaveDocument(doc: ReportDocument): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE_NAME, 'readwrite');
    tx.objectStore(DOCS_STORE_NAME).put(doc);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetDocument(id: string): Promise<ReportDocument | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE_NAME, 'readonly');
    const req = tx.objectStore(DOCS_STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAllDocuments(): Promise<ReportDocument[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE_NAME, 'readonly');
    const req = tx.objectStore(DOCS_STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result || []) as ReportDocument[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDeleteDocument(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE_NAME, 'readwrite');
    tx.objectStore(DOCS_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
import type { ReportDocument } from '../types/report';
