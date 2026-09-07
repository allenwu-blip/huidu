/**
 * Local-first storage. IndexedDB only — nothing is sent anywhere, there is no server.
 *
 * One object store keyed by card id, so a re-import merges in place and review state
 * (which lives on the same record) is never clobbered. See schema.mergeById.
 */

const DB_NAME = 'w3-highlights';
const DB_VERSION = 1;
const STORE = 'cards';

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('due', 'review.due');
        os.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let out;
        try {
          out = fn(store);
        } catch (e) {
          reject(e);
          return;
        }
        t.oncomplete = () => resolve(out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export async function allCards() {
  const rows = await tx('readonly', (s) => {
    const r = s.getAll();
    return new Promise((res, rej) => {
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  });
  return await rows;
}

export async function putAll(cards) {
  await tx('readwrite', (s) => {
    for (const c of cards) s.put(c);
  });
  return cards.length;
}

export async function putOne(card) {
  await tx('readwrite', (s) => s.put(card));
  return card;
}

export async function clearAll() {
  await tx('readwrite', (s) => s.clear());
}

export async function exportJson() {
  const cards = await allCards();
  return JSON.stringify({ exportedAt: Math.floor(Date.now() / 1000), cards }, null, 2);
}
