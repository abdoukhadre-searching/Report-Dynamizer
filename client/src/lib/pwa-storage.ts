export interface OfflineUser {
  id: string;
  name: string;
  role: string;
}

export interface StoredQuery {
  key: string;
  ownerId: string;
  queryKey: unknown[];
  data: unknown;
  updatedAt: number;
}

interface StoredDraft {
  key: string;
  value: unknown;
  updatedAt: number;
}

const DATABASE_NAME = "mab-projets-pwa";
const DATABASE_VERSION = 1;
const META_STORE = "meta";
const DRAFT_STORE = "drafts";
const QUERY_STORE = "queries";
const OFFLINE_USER_KEY = "offline-user";

function isBrowserStorageAvailable() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE);
      }
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        database.createObjectStore(DRAFT_STORE, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(QUERY_STORE)) {
        database.createObjectStore(QUERY_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  if (!isBrowserStorageAvailable()) {
    throw new Error("Le stockage local du navigateur n'est pas disponible.");
  }

  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    const result = await action(transaction.objectStore(storeName));
    await transactionDone(transaction);
    return result;
  } finally {
    database.close();
  }
}

export async function loadOfflineUser(): Promise<OfflineUser | null> {
  if (!isBrowserStorageAvailable()) return null;

  try {
    return await withStore(META_STORE, "readonly", async (store) => {
      const value = await requestResult<OfflineUser | undefined>(store.get(OFFLINE_USER_KEY));
      return value ?? null;
    });
  } catch {
    return null;
  }
}

export async function saveOfflineUser(user: OfflineUser): Promise<void> {
  if (!isBrowserStorageAvailable()) return;
  await withStore(META_STORE, "readwrite", async (store) => {
    await requestResult(store.put(user, OFFLINE_USER_KEY));
  });
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  if (!isBrowserStorageAvailable()) return null;

  try {
    return await withStore(DRAFT_STORE, "readonly", async (store) => {
      const record = await requestResult<StoredDraft | undefined>(store.get(key));
      return (record?.value as T | undefined) ?? null;
    });
  } catch {
    return null;
  }
}

export async function saveDraft(key: string, value: unknown): Promise<void> {
  if (!isBrowserStorageAvailable()) return;
  await withStore(DRAFT_STORE, "readwrite", async (store) => {
    await requestResult(store.put({ key, value, updatedAt: Date.now() } satisfies StoredDraft));
  });
}

export async function deleteDraft(key: string): Promise<void> {
  if (!isBrowserStorageAvailable()) return;
  await withStore(DRAFT_STORE, "readwrite", async (store) => {
    await requestResult(store.delete(key));
  });
}

export async function loadStoredQueries(ownerId: string): Promise<StoredQuery[]> {
  if (!isBrowserStorageAvailable()) return [];

  try {
    return await withStore(QUERY_STORE, "readonly", async (store) => {
      const records = await requestResult<StoredQuery[]>(store.getAll());
      return records.filter((record) => record.ownerId === ownerId);
    });
  } catch {
    return [];
  }
}

export async function saveStoredQueries(records: StoredQuery[], ownerId: string): Promise<void> {
  if (!isBrowserStorageAvailable()) return;
  await withStore(QUERY_STORE, "readwrite", async (store) => {
    const existing = await requestResult<StoredQuery[]>(store.getAll());
    const keptKeys = new Set(records.map((record) => record.key));

    await Promise.all(
      existing
        .filter((record) => record.ownerId === ownerId && !keptKeys.has(record.key))
        .map((record) => requestResult(store.delete(record.key))),
    );
    await Promise.all(records.map((record) => requestResult(store.put(record))));
  });
}

export async function clearPwaData(): Promise<void> {
  if (!isBrowserStorageAvailable()) return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction([META_STORE, DRAFT_STORE, QUERY_STORE], "readwrite");
    await Promise.all([
      requestResult(transaction.objectStore(META_STORE).clear()),
      requestResult(transaction.objectStore(DRAFT_STORE).clear()),
      requestResult(transaction.objectStore(QUERY_STORE).clear()),
    ]);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}