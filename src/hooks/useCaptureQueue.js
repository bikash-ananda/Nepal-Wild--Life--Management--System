import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/api/apiClient";

const DB_NAME = "nepal-wildlife-field-capture";
const STORE = "captures";

function openQueueDb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error("Offline storage is not available on this browser."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline capture storage."));
  });
}

async function readQueue(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function saveItem(db, item) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteStoredItem(db, id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then((response) => response.blob());
}

function withPreview(item) {
  if (!item.photoBlob || item.photoPreview) return item;
  return { ...item, photoPreview: URL.createObjectURL(item.photoBlob) };
}

export function useCaptureQueue(online, onProcessed) {
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [storageError, setStorageError] = useState("");
  const queueRef = useRef(queue);
  const dbRef = useRef(null);
  const flushLock = useRef(false);
  const onProcessedRef = useRef(onProcessed);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { onProcessedRef.current = onProcessed; }, [onProcessed]);

  useEffect(() => {
    let cancelled = false;
    openQueueDb().then(async (db) => {
      dbRef.current = db;
      const saved = await readQueue(db);
      if (!cancelled) {
        const restored = saved
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .map((item) => withPreview(item.status === "processing" ? { ...item, status: "failed", error: "Sync was interrupted. Retry when connected." } : item));
        queueRef.current = restored;
        setQueue(restored);
      }
    }).catch((error) => {
      setStorageError(error.message || "Offline capture storage is unavailable.");
      console.error("Offline capture queue unavailable", error);
    }).finally(() => {
      if (!cancelled) setLoadingQueue(false);
    });
    return () => { cancelled = true; };
  }, []);

  const commit = useCallback((next, changedId, removedId) => {
    queueRef.current = next;
    setQueue(next);
    const db = dbRef.current;
    if (db && removedId) deleteStoredItem(db, removedId).catch((error) => console.error("Could not remove queued capture", error));
    if (db && changedId) {
      const item = next.find((entry) => entry.id === changedId);
      if (item) {
        const { photoPreview, ...stored } = item;
        saveItem(db, stored).catch((error) => console.error("Could not save queued capture", error));
      }
    }
  }, []);

  const enqueue = useCallback(async (capture) => {
    if (!dbRef.current) throw new Error(storageError || "Offline capture storage is not ready. Please try again.");
    const photoBlob = await dataUrlToBlob(capture.photoDataUrl);
    const item = withPreview({
      id: `cap-${crypto.randomUUID()}`,
      capture_id: crypto.randomUUID(),
      status: "pending",
      created_at: new Date().toISOString(),
      ...capture,
      photoBlob,
    });
    delete item.photoDataUrl;
    const stored = { ...item };
    delete stored.photoPreview;
    await saveItem(dbRef.current, stored);
    const next = [item, ...queueRef.current];
    commit(next);
    return item;
  }, [commit, storageError]);

  const removeItem = useCallback((id) => {
    const oldItem = queueRef.current.find((item) => item.id === id);
    if (oldItem?.photoPreview) URL.revokeObjectURL(oldItem.photoPreview);
    commit(queueRef.current.filter((item) => item.id !== id), null, id);
  }, [commit]);

  const flush = useCallback(async () => {
    if (!online || flushLock.current || loadingQueue) return;
    const pending = queueRef.current.filter((item) => item.status === "pending" || item.status === "failed");
    if (!pending.length) return;

    flushLock.current = true;
    setSyncing(true);
    try {
      for (const item of pending) {
        const mark = (patch) => {
          const updated = { ...item, ...patch };
          commit(queueRef.current.map((entry) => entry.id === item.id ? withPreview(updated) : entry), item.id);
          Object.assign(item, patch);
        };
        mark({ status: "processing", error: undefined });
        try {
          const upload = await api.integrations.Core.UploadPrivateFile({ file: item.photoBlob });
          const result = await api.functions.invoke("fieldCapture", {
            action: "processCapture",
            capture_id: item.capture_id,
            photo_uri: upload.file_uri,
            latitude: item.latitude,
            longitude: item.longitude,
            accuracy: item.accuracy,
            site_id: item.site_id,
            location_name: item.location_name,
            notes: item.notes,
            captured_at: item.captured_at,
          });
          mark({ status: "processed", result: result.data, error: undefined });
          onProcessedRef.current?.(item.id, result.data);
        } catch (error) {
          mark({ status: "failed", error: error.message || "Upload failed" });
        }
      }
    } finally {
      flushLock.current = false;
      setSyncing(false);
    }
  }, [online, loadingQueue, commit]);

  useEffect(() => {
    if (online && !loadingQueue) flush();
  }, [online, loadingQueue, flush]);

  return { queue, enqueue, removeItem, flush, syncing, loadingQueue, storageError };
}
