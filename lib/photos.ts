// T-30 사진 서랍 (SPEC §4 · NFR-09)
//
// 🔑 글자 기록(localStorage)과 사진을 **다른 서랍**에 넣는다.
//    localStorage는 약 5MB뿐이라 사진을 넣으면 며칠 만에 찬다.
// 🔒 여기 들어온 사진은 우리가 밖으로 내보내지 않는다.
//    (밥 사진만 판정하려고 서버로 한 번 보내고, 눈바디는 절대 안 보낸다 — FN-55)

const DB_NAME = "chagok-photos";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putPhoto(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getPhoto(key: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

export async function deletePhoto(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
  });
  db.close();
}

/** 설정에서 「사진 90장 · 약 18MB」를 보여주기 위한 값 (FN-72) */
export async function photoUsage(): Promise<{ count: number; bytes: number }> {
  const db = await openDb();
  const result = await new Promise<{ count: number; bytes: number }>((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const countReq = store.count();
    const allReq = store.getAll();
    tx.oncomplete = () => {
      const blobs = (allReq.result as Blob[]) ?? [];
      resolve({
        count: countReq.result ?? 0,
        bytes: blobs.reduce((sum, b) => sum + (b?.size ?? 0), 0),
      });
    };
  });
  db.close();
  return result;
}

/**
 * NFR-09 사진 자동 축소 — 긴 변 1080px, 200KB 내외.
 * 요즘 폰 사진은 한 장에 3~5MB라 그대로 두면 저장 공간이 금방 찬다.
 */
export async function shrinkImage(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const long = Math.max(bitmap.width, bitmap.height);
  const scale = long > 1080 ? 1080 / long : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  // 200KB 근처가 될 때까지 화질을 조금씩 낮춘다
  for (const quality of [0.82, 0.7, 0.58, 0.45]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (blob && (blob.size <= 220_000 || quality === 0.45)) return blob;
  }
  return file;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
