/**
 * IndexedDB の最小ラッパ。
 * 用途は (1) FSAディレクトリハンドルの永続化 (2) 生成画像の一時キャッシュ のみ。
 * 汎用ORMにはしない。
 */

const DB_NAME = "atelier-studio";
const DB_VERSION = 1;
const STORE_HANDLES = "handles";
const STORE_IMAGES = "images";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_HANDLES)) db.createObjectStore(STORE_HANDLES);
      if (!db.objectStoreNames.contains(STORE_IMAGES)) db.createObjectStore(STORE_IMAGES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const idb = {
  getHandle(key: string): Promise<FileSystemDirectoryHandle | undefined> {
    return withStore(STORE_HANDLES, "readonly", (s) => s.get(key));
  },
  putHandle(key: string, handle: FileSystemDirectoryHandle): Promise<IDBValidKey> {
    return withStore(STORE_HANDLES, "readwrite", (s) => s.put(handle, key));
  },
  deleteHandle(key: string): Promise<undefined> {
    return withStore(STORE_HANDLES, "readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
  },
  getImage(key: string): Promise<Blob | undefined> {
    return withStore(STORE_IMAGES, "readonly", (s) => s.get(key));
  },
  putImage(key: string, blob: Blob): Promise<IDBValidKey> {
    return withStore(STORE_IMAGES, "readwrite", (s) => s.put(blob, key));
  },
  listImageKeys(): Promise<IDBValidKey[]> {
    return withStore(STORE_IMAGES, "readonly", (s) => s.getAllKeys());
  },
  deleteImage(key: string): Promise<undefined> {
    return withStore(STORE_IMAGES, "readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
  },
};
