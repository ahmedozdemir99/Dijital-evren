const DB_NAME = 'DijitalEvrenimDB';
const DB_VERSION = 3;

export const STORE_NAMES = [
  'books',
  'quotes',
  'knowledge_nodes',
  'entity_relations',
  'quick_notes',
  'module_records',
  'collections',
  'attachments',
  'activity_logs',
  'notifications',
  'module_settings',
  'external_apps',
  'preferences',
  'profile',
  'content_migrations',
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of STORE_NAMES) {
        if (!db.objectStoreNames.contains(storeName)) {
          const keyPath =
            storeName === 'module_settings'
              ? 'moduleId'
              : storeName === 'external_apps'
                ? 'appId'
                : 'id';
          const store = db.createObjectStore(storeName, { keyPath });
          if (storeName === 'module_records') {
            store.createIndex('by_module', 'moduleId', { unique: false });
            store.createIndex('by_date', 'date', { unique: false });
          }
        }
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('IndexedDB açılamadı.'));
    };
  });

  return dbPromise;
}

export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error(`${storeName} okunamadı.`));
  });
}

export async function getOneFromStore<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error ?? new Error(`${storeName} kaydı okunamadı.`));
  });
}

export async function putInStore<T>(storeName: StoreName, item: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`${storeName} kaydı yazılamadı.`));
  });
}

export async function putManyInStore<T>(storeName: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`${storeName} toplu yazım hatası.`));
  });
}

export async function deleteFromStore(storeName: StoreName, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`${storeName} kaydı silinemedi.`));
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`${storeName} temizlenemedi.`));
  });
}
