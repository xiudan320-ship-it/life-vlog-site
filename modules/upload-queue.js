export function createUploadQueue({
  dbName,
  storeName,
  indexedDb = globalThis.indexedDB,
  onChanged = () => {},
}) {
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!indexedDb) {
        reject(new Error("当前浏览器不支持上传队列。"));
        return;
      }
      const request = indexedDb.open(dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("上传队列打开失败。"));
    });
  }

  async function enqueue(payload) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put({
        ...payload,
        queuedAt: new Date().toISOString(),
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () =>
        reject(transaction.error || new Error("写入上传队列失败。"));
    });
    db.close();
    onChanged();
  }

  async function list(userId = "") {
    if (!indexedDb || !userId) return [];
    const db = await openDb();
    const items = await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () =>
        reject(request.error || new Error("读取上传队列失败。"));
    });
    db.close();
    return items
      .filter((item) => item.userId === userId)
      .sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      );
  }

  async function remove(id) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = () =>
        reject(transaction.error || new Error("删除上传队列失败。"));
    });
    db.close();
    onChanged();
  }

  return { enqueue, list, remove };
}
