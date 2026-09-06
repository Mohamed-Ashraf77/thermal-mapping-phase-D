import type { User } from '../types/user';
import {
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from '../types/user';
import { hashPassword } from './authUtils';
import { createId } from '../utils/id';

const DB_NAME = 'thermal-mapping-studio';
const DB_VERSION = 4;
const USERS_STORE = 'users';
const SENSOR_STORE = 'sensorFiles';
const DOCS_STORE = 'documents';
const AUDIT_STORE = 'auditTrail';

function createMissingStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(SENSOR_STORE)) {
    db.createObjectStore(SENSOR_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(DOCS_STORE)) {
    db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(USERS_STORE)) {
    db.createObjectStore(USERS_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(AUDIT_STORE)) {
    const auditStore = db.createObjectStore(AUDIT_STORE, { keyPath: 'id' });
    auditStore.createIndex('byTimestamp', 'timestampMs', { unique: false });
    auditStore.createIndex('byUser', 'userId', { unique: false });
    auditStore.createIndex('byAction', 'action', { unique: false });
    auditStore.createIndex('byDocument', 'documentId', { unique: false });
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;

      createMissingStores(db);
    };
    req.onsuccess = () => {
      const db = req.result;
      const requiredStores = [SENSOR_STORE, DOCS_STORE, USERS_STORE, AUDIT_STORE];
      if (requiredStores.every((store) => db.objectStoreNames.contains(store))) {
        resolve(db);
        return;
      }

      const repairVersion = db.version + 1;
      db.close();
      const repairReq = indexedDB.open(DB_NAME, repairVersion);
      repairReq.onupgradeneeded = () => createMissingStores(repairReq.result);
      repairReq.onsuccess = () => resolve(repairReq.result);
      repairReq.onerror = () => reject(repairReq.error);
      repairReq.onblocked = () => reject(new Error('IndexedDB schema repair was blocked.'));
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Generic helpers (typed to USERS_STORE) ────────────────────────────────

async function usersGetAll(): Promise<User[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USERS_STORE, 'readonly');
    const req = tx.objectStore(USERS_STORE).getAll();
    req.onsuccess = () => resolve((req.result as User[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function usersPut(user: User): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USERS_STORE, 'readwrite');
    tx.objectStore(USERS_STORE).put(user);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function usersGet(id: string): Promise<User | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USERS_STORE, 'readonly');
    const req = tx.objectStore(USERS_STORE).get(id);
    req.onsuccess = () => resolve(req.result as User | undefined);
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  return usersGetAll();
}

export async function getUserById(id: string): Promise<User | null> {
  const u = await usersGet(id);
  return u ?? null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const all = await usersGetAll();
  return all.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function saveUser(user: User): Promise<void> {
  await usersPut(user);
}

export async function createUser(
  params: {
    username: string;
    displayName: string;
    email: string;
    role: User['role'];
    password: string;
    createdBy: string;
  },
): Promise<User> {
  const existing = await getUserByUsername(params.username);
  if (existing) throw new Error(`Username "${params.username}" is already taken.`);

  const passwordHash = await hashPassword(params.password);
  const user: User = {
    id: createId('user'),
    username: params.username.trim(),
    displayName: params.displayName.trim(),
    email: params.email.trim(),
    role: params.role,
    passwordHash,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy,
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    mustChangePassword: false,
  };
  await usersPut(user);
  return user;
}

export async function updateUser(id: string, patch: Partial<Omit<User, 'id'>>): Promise<User> {
  const existing = await usersGet(id);
  if (!existing) throw new Error('User not found.');
  const updated = { ...existing, ...patch };
  await usersPut(updated);
  return updated;
}

/** Record a successful login: resets failure counter, updates lastLoginAt */
export async function recordLoginSuccess(userId: string): Promise<User> {
  return updateUser(userId, {
    lastLoginAt: new Date().toISOString(),
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
}

/** Record a failed login: increments counter, locks if threshold exceeded */
export async function recordLoginFailure(userId: string): Promise<User> {
  const user = await usersGet(userId);
  if (!user) throw new Error('User not found.');
  const attempts = (user.failedLoginAttempts || 0) + 1;
  const lockedUntil =
    attempts >= MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
      : null;
  return updateUser(userId, { failedLoginAttempts: attempts, lockedUntil });
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword);
  await updateUser(userId, { passwordHash: hash, mustChangePassword: false });
}

// ── First-launch seed ─────────────────────────────────────────────────────

/** Creates the default System Administrator on first launch if no users exist. */
export async function seedDefaultAdminIfNeeded(): Promise<void> {
  const all = await usersGetAll();
  if (all.length > 0) return;

  const hash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  const admin: User = {
    id: createId('user'),
    username: DEFAULT_ADMIN_USERNAME,
    displayName: 'System Administrator',
    email: 'admin@system.local',
    role: 'system_admin',
    passwordHash: hash,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    mustChangePassword: true,  // force immediate password change
  };
  await usersPut(admin);
}
