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
      const db = request.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };

    request.onblocked = () => {
      dbPromise = null;
      reject(new Error('Veri tabanı güncellemesi engellendi. Diğer Dijital Evrenim sekmelerini kapatıp yeniden açın.'));
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

interface MergeEntry {
  store: StoreName;
  keyPath: string;
  items: unknown[];
}

function recordTimestamp(record: Record<string, unknown>): string {
  const value = record.updatedAt ?? record.createdAt ?? record.lastSyncAt ?? record.lastTestAt;
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
}

export async function mergeLatestRecords(entries: MergeEntry[]): Promise<void> {
  if (!entries.length) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(entries.map(({ store }) => store), 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Eşitleme geri alındı.'));
    for (const { store, keyPath, items } of entries) {
      const target = tx.objectStore(store);
      for (const value of items) {
        if (!value || typeof value !== 'object') continue;
        const incoming = value as Record<string, unknown>;
        const key = incoming[keyPath];
        if (typeof key !== 'string' || !key) continue;
        const request = target.get(key);
        request.onsuccess = () => {
          const current = request.result as Record<string, unknown> | undefined;
          if (!current || recordTimestamp(incoming) > recordTimestamp(current)) {
            target.put(incoming);
          }
        };
      }
    }
  });
}

export async function insertNewRecords(entries: Array<{ store: StoreName; items: { id: string }[] }>): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(entries.map(({ store }) => store), 'readwrite');
    let added = 0;
    tx.oncomplete = () => resolve(added);
    tx.onabort = () => reject(tx.error ?? new Error('İçe aktarma geri alındı.'));
    for (const { store, items } of entries) {
      const target = tx.objectStore(store);
      for (const item of new Map(items.map((record) => [record.id, record])).values()) {
        const request = target.getKey(item.id);
        request.onsuccess = () => {
          if (request.result === undefined) {
            target.add(item);
            added += 1;
          }
        };
      }
    }
  });
}

interface RestoreEntry {
  store: StoreName;
  items: unknown[];
  matches?: (item: Record<string, unknown>) => boolean;
}

export async function restoreRecords(entries: RestoreEntry[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(entries.map(({ store }) => store), 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Yedek geri yükleme işlemi geri alındı.'));
    for (const { store, items, matches } of entries) {
      const target = tx.objectStore(store);
      const put = () => {
        try {
          for (const item of items) target.put(item);
        } catch {
          tx.abort();
        }
      };
      if (matches) {
        const request = target.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            put();
            return;
          }
          if (matches(cursor.value)) cursor.delete();
          cursor.continue();
        };
      } else {
        target.clear();
        put();
      }
    }
  });
}
