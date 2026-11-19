const DB_NAME = "wams-offline-reports";
const DB_VERSION = 1;
const STORE = "reports";
const SYNC_TAG = "wams-public-report-sync";

export async function requestOfflineStoragePersistence() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* Browser-managed storage remains available on a best-effort basis. */ }
  return false;
}

export function createOfflineReportId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    return (character === "x" ? random : (random & 3 | 8)).toString(16);
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Offline storage is unavailable in this browser."));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("status_created", ["status", "created_at"]);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline report storage."));
  });
}

async function withStore(mode, callback) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      let result;
      try { result = callback(store); } catch (error) { reject(error); return; }
      transaction.oncomplete = () => resolve(result?.result ?? result);
      transaction.onerror = () => reject(transaction.error || new Error("Offline report storage failed."));
      transaction.onabort = () => reject(transaction.error || new Error("Offline report storage was interrupted."));
    });
  } finally {
    db.close();
  }
}

export async function saveCaptureDraft({ id, payload, photoBlob, audioBlob = null, consentAt = null }) {
  if (!id || !(photoBlob instanceof Blob) || !payload || typeof payload !== "object") {
    throw new Error("The photo could not be saved on this device.");
  }
  const record = {
    id: String(id),
    kind: "capture",
    payload,
    photo_blob: photoBlob,
    audio_blob: audioBlob,
    status: "draft",
    consent_at: consentAt || null,
    consent_text_version: consentAt ? "wlms-public-capture-v1" : null,
    attempts: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_error: "",
  };
  await withStore("readwrite", (store) => store.put(record));
  return record;
}

export async function deleteOfflineReport(id) {
  return withStore("readwrite", (store) => store.delete(String(id)));
}

export async function enqueueOfflineReport({ id, kind, payload, photoBlob = null, audioBlob = null }) {
  if (!id || !["damage", "capture"].includes(kind) || !payload || typeof payload !== "object") {
    throw new Error("The report could not be prepared for offline storage.");
  }
  const record = {
    id: String(id),
    kind,
    payload,
    photo_blob: photoBlob,
    audio_blob: audioBlob,
    status: "pending",
    attempts: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_error: "",
  };
  await withStore("readwrite", (store) => store.put(record));
  return record;
}

export async function getOfflineReports() {
  return withStore("readonly", (store) => store.getAll());
}

export async function getOfflineReport(id) {
  return withStore("readonly", (store) => store.get(String(id)));
}

async function claimOfflineReport(id) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const request = store.get(String(id));
      let claimed = false;
      request.onsuccess = () => {
        const current = request.result;
        const expiredLease = current?.status === "uploading" && Number(current.lock_until || 0) <= Date.now();
        if (!current || (!["pending", "retry"].includes(current.status) && !expiredLease)) return;
        store.put({
          ...current,
          status: "uploading",
          attempts: (current.attempts || 0) + 1,
          lock_until: Date.now() + 600000,
          last_error: "",
          updated_at: new Date().toISOString(),
        });
        claimed = true;
      };
      transaction.oncomplete = () => resolve(claimed);
      transaction.onerror = () => reject(transaction.error || new Error("Could not claim report for sync."));
      transaction.onabort = () => reject(transaction.error || new Error("Report sync claim was interrupted."));
    });
  } finally { db.close(); }
}

export async function updateOfflineReport(id, patch) {
  const current = await getOfflineReport(id);
  if (!current) return null;
  return withStore("readwrite", (store) => store.put({
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  }));
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function sendCapture(record) {
  let photoUri = record.photo_uri;
  if (!photoUri) {
    if (!(record.photo_blob instanceof Blob)) throw new Error("The saved photo is missing. Please capture it again.");
    const form = new FormData();
    form.append("consent", "true");
    form.append("file", record.photo_blob, "wams-capture.jpg");
    const uploadResponse = await fetch("/api/public/uploads", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const upload = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok || !upload.file_uri) {
      const error = new Error(upload.error || "The photo could not be uploaded.");
      error.status = uploadResponse.status;
      throw error;
    }
    photoUri = upload.file_uri;
    await updateOfflineReport(record.id, { photo_uri: photoUri });
  }
  let audioUri = record.audio_uri || "";
  if (record.audio_blob instanceof Blob && !audioUri) {
    const audioForm = new FormData();
    audioForm.append("consent", "true");
    audioForm.append("audio_consent", "true");
    audioForm.append("file", record.audio_blob, "wams-voice-note.webm");
    const audioResponse = await fetch("/api/public/uploads", {
      method: "POST",
      credentials: "include",
      body: audioForm,
    });
    const audioUpload = await audioResponse.json().catch(() => ({}));
    if (!audioResponse.ok || !audioUpload.file_uri) {
      const error = new Error(audioUpload.error || "The voice recording could not be uploaded.");
      error.status = audioResponse.status;
      throw error;
    }
    audioUri = audioUpload.file_uri;
    await updateOfflineReport(record.id, { audio_uri: audioUri });
  }
  return postJson("/api/functions/publicCapture", {
    ...record.payload,
    photo_uri: photoUri,
    audio_uri: audioUri || undefined,
    capture_id: record.id,
    consent: true,
  });
}

async function sendDamage(record) {
  return postJson("/api/public/reports", {
    ...record.payload,
    submission_id: record.id,
  });
}

export async function retryFailedOfflineReports() {
  const failed = (await getOfflineReports()).filter((item) => item.status === "failed");
  for (const item of failed) {
    await updateOfflineReport(item.id, { status: "retry", lock_until: null, last_error: "" });
  }
  return failed.length;
}

export async function syncOfflineReports({ onProgress } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { synced: 0, pending: (await getOfflineReports()).filter((item) => item.status !== "synced").length };
  }
  const records = (await getOfflineReports())
    .filter((item) => item.status === "pending" || item.status === "retry")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  let synced = 0;
  for (const record of records) {
    if (!(await claimOfflineReport(record.id))) continue;
    onProgress?.({ id: record.id, status: "uploading" });
    try {
      if (record.kind === "capture") await sendCapture(record);
      else await sendDamage(record);
      await updateOfflineReport(record.id, { status: "synced", photo_blob: null, audio_blob: null, lock_until: null, last_error: "" });
      synced += 1;
      onProgress?.({ id: record.id, status: "synced" });
    } catch (error) {
      const retryable = !error.status || error.status === 408 || error.status === 429 || error.status >= 500;
      await updateOfflineReport(record.id, {
        status: retryable ? "retry" : "failed",
        lock_until: null,
        last_error: String(error.message || "Upload failed").slice(0, 300),
      });
      onProgress?.({ id: record.id, status: retryable ? "retry" : "failed", error });
      if (retryable) break;
    }
  }
  const remaining = (await getOfflineReports()).filter((item) => item.status === "pending" || item.status === "retry" || item.status === "failed").length;
  return { synced, pending: remaining };
}

export async function requestOfflineReportSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.sync?.register) {
      await registration.sync.register(SYNC_TAG);
      return true;
    }
  } catch { /* Foreground retry remains available when Background Sync is unsupported. */ }
  return false;
}

export { SYNC_TAG };
