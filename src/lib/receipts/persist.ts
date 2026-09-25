import type { Receipt, Rule } from "@/lib/receipts/model";
import { buildSamples } from "@/lib/receipts/samples";

const DB_NAME = "vela";
const DB_VERSION = 1;

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("receipts")) db.createObjectStore("receipts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("rules")) db.createObjectStore("rules", { keyPath: "key" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

type Snapshot = { seeded: boolean; receipts: Receipt[]; rules: Rule[] };

function readSnapshot(db: IDBDatabase) {
  return new Promise<Snapshot>((resolve, reject) => {
    const tx = db.transaction(["receipts", "rules", "meta"], "readonly");
    const snap: Snapshot = { seeded: false, receipts: [], rules: [] };
    const metaReq = tx.objectStore("meta").get("seeded");
    const slipReq = tx.objectStore("receipts").getAll();
    const ruleReq = tx.objectStore("rules").getAll();
    metaReq.onsuccess = () => {
      snap.seeded = Boolean(metaReq.result);
    };
    slipReq.onsuccess = () => {
      snap.receipts = slipReq.result as Receipt[];
    };
    ruleReq.onsuccess = () => {
      snap.rules = ruleReq.result as Rule[];
    };
    tx.oncomplete = () => resolve(snap);
    tx.onerror = () => reject(tx.error);
  });
}

function writeSamples(db: IDBDatabase, samples: Receipt[]) {
  return new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(["receipts", "meta"], "readwrite");
    let wrote = false;
    const check = tx.objectStore("meta").get("seeded");
    check.onsuccess = () => {
      if (check.result) return;
      wrote = true;
      const slips = tx.objectStore("receipts");
      for (const slip of samples) slips.put(slip);
      tx.objectStore("meta").put("1", "seeded");
    };
    tx.oncomplete = () => resolve(wrote);
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDesk(): Promise<{ receipts: Receipt[]; rules: Rule[] }> {
  const db = await openDb();
  try {
    const snap = await readSnapshot(db);
    if (snap.seeded) return { receipts: snap.receipts, rules: snap.rules };
    const samples = buildSamples();
    const wrote = await writeSamples(db, samples);
    if (!wrote) {
      const again = await readSnapshot(db);
      return { receipts: again.receipts, rules: again.rules };
    }
    return { receipts: samples, rules: [] };
  } finally {
    db.close();
  }
}

function mutate(store: string, run: (store: IDBObjectStore) => void) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        run(tx.objectStore(store));
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export function putReceipt(receipt: Receipt) {
  return mutate("receipts", (store) => {
    store.put(receipt);
  });
}

export function putRule(rule: Rule) {
  return mutate("rules", (store) => {
    store.put(rule);
  });
}

export function deleteReceipt(id: string) {
  return mutate("receipts", (store) => {
    store.delete(id);
  });
}

export async function deleteSamples() {
  const db = await openDb();
  try {
    const snap = await readSnapshot(db);
    const keep = snap.receipts.filter((slip) => slip.origin !== "sample");
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("receipts", "readwrite");
      const store = tx.objectStore("receipts");
      for (const slip of snap.receipts) {
        if (slip.origin === "sample") store.delete(slip.id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return keep;
  } finally {
    db.close();
  }
}
