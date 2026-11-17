/* Background Sync worker for the shared WAMS public-report queue. */
(() => {
  const DB_NAME = "wams-offline-reports";
  const STORE = "reports";

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("status_created", ["status", "created_at"]);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function allReports() {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }

  async function patchReport(id, patch) {
    const db = await openDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const get = store.get(id);
        get.onsuccess = () => {
          if (get.result) store.put({ ...get.result, ...patch, updated_at: new Date().toISOString() });
        };
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }

  async function claimReport(id) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const request = store.get(id);
        let claimed = false;
        request.onsuccess = () => {
          const current = request.result;
          const expiredLease = current?.status === "uploading" && Number(current.lock_until || 0) <= Date.now();
          if (!current || (!["pending", "retry"].includes(current.status) && !expiredLease)) return;
          store.put({
            ...current,
            status: "uploading",
            attempts: (current.attempts || 0) + 1,
            lock_until: Date.now() + 120000,
            last_error: "",
            updated_at: new Date().toISOString(),
          });
          claimed = true;
        };
        tx.oncomplete = () => resolve(claimed);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }

  async function postJson(path, payload) {
    const response = await fetch(path, {
      method: "POST", credentials: "include",
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
      if (!(record.photo_blob instanceof Blob)) throw new Error("Saved photo is missing.");
      const form = new FormData();
      form.append("consent", "true");
      form.append("file", record.photo_blob, "wams-capture.jpg");
      const response = await fetch("/api/public/uploads", { method: "POST", credentials: "include", body: form });
      const upload = await response.json().catch(() => ({}));
      if (!response.ok || !upload.file_uri) {
        const error = new Error(upload.error || "Photo upload failed.");
        error.status = response.status;
        throw error;
      }
      photoUri = upload.file_uri;
      await patchReport(record.id, { photo_uri: photoUri });
    }
    return postJson("/api/functions/publicCapture", {
      ...record.payload, photo_uri: photoUri, capture_id: record.id, consent: true,
    });
  }

  async function sync() {
    const records = (await allReports())
      .filter((item) => item.status === "pending" || item.status === "retry")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const record of records) {
      if (!(await claimReport(record.id))) continue;
      try {
        if (record.kind === "capture") await sendCapture(record);
        else await postJson("/api/public/reports", { ...record.payload, submission_id: record.id });
        await patchReport(record.id, { status: "synced", photo_blob: null, lock_until: null, last_error: "" });
      } catch (error) {
        const retryable = !error.status || error.status === 408 || error.status === 429 || error.status >= 500;
        await patchReport(record.id, {
          status: retryable ? "retry" : "failed",
          lock_until: null,
          last_error: String(error.message || "Upload failed").slice(0, 300),
        });
        if (retryable) throw error;
      }
    }
  }

  self.wamsSyncOfflineReports = sync;
})();