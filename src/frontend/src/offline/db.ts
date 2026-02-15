// IndexedDB wrapper without external dependencies

interface OfflineOrder {
  orderNo: string;
  [key: string]: any;
}

interface OfflineMasterDesign {
  designCode: string;
  [key: string]: any;
}

interface QueueItem {
  id?: number;
  orders: any[];
  timestamp: number;
}

const DB_NAME = 'karigarflow-offline';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'orderNo' });
      }
      if (!db.objectStoreNames.contains('masterDesigns')) {
        db.createObjectStore('masterDesigns', { keyPath: 'designCode' });
      }
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
    };
  });
}

export async function getDB(): Promise<IDBDatabase> {
  return openDatabase();
}

export async function cacheOrders(orders: OfflineOrder[]): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction(['orders'], 'readwrite');
  const store = transaction.objectStore('orders');

  return new Promise((resolve, reject) => {
    const promises = orders.map((order) => {
      return new Promise<void>((res, rej) => {
        const request = store.put(order);
        request.onsuccess = () => res();
        request.onerror = () => rej(request.error);
      });
    });

    Promise.all(promises)
      .then(() => resolve())
      .catch(reject);
  });
}

export async function getCachedOrders(): Promise<OfflineOrder[]> {
  const db = await getDB();
  const transaction = db.transaction(['orders'], 'readonly');
  const store = transaction.objectStore('orders');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueIngestion(batch: Omit<QueueItem, 'id'>): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction(['queue'], 'readwrite');
  const store = transaction.objectStore('queue');

  return new Promise((resolve, reject) => {
    const request = store.add(batch);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedIngestions(): Promise<QueueItem[]> {
  const db = await getDB();
  const transaction = db.transaction(['queue'], 'readonly');
  const store = transaction.objectStore('queue');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction(['queue'], 'readwrite');
  const store = transaction.objectStore('queue');

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function setLastSyncTime(time: number): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction(['metadata'], 'readwrite');
  const store = transaction.objectStore('metadata');

  return new Promise((resolve, reject) => {
    const request = store.put(time, 'lastSync');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLastSyncTime(): Promise<number | null> {
  const db = await getDB();
  const transaction = db.transaction(['metadata'], 'readonly');
  const store = transaction.objectStore('metadata');

  return new Promise((resolve, reject) => {
    const request = store.get('lastSync');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
