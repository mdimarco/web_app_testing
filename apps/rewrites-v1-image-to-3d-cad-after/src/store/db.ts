const DB_NAME = 'img2cad';
const STORE = 'session';
const KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface SessionRecord {
  imageDataUrl: string;
  imageName: string;
  imageType: string;
  imageSizeBytes: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  downsampled: boolean;
  threshold: { threshold: number; invert: boolean; minIslandArea: number };
  contour: { simplifyTolerance: number; smoothing: number };
  solid: { targetWidthMm: number; extrudeDepthMm: number; bevelMm: number; twoSided: boolean };
  savedAt: number;
}

export async function saveSession(rec: SessionRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(rec, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadSession(): Promise<SessionRecord | undefined> {
  const db = await openDb();
  const rec = await new Promise<SessionRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as SessionRecord | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rec;
}

export async function clearSession(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
