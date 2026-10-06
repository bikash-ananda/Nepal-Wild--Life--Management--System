import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Offline-first hybrid capture queue. Captures (photo as dataURL + GPS + notes)
// are stored in localStorage. When online, the queue flushes: each item uploads
// its photo privately, calls the fieldCapture backend function, and records the
// classification result. Failed items stay queued for retry.

const KEY = "field_capture_queue";

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function saveQueue(q) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* storage may be full — best effort */
  }
}

function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then((r) => r.blob());
}

export function useCaptureQueue(online, onProcessed) {
  const [queue, setQueue] = useState(loadQueue);
  const [syncing, setSyncing] = useState(false);
  const queueRef = useRef(queue);
  const onProcessedRef = useRef(onProcessed);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    onProcessedRef.current = onProcessed;
  }, [onProcessed]);

  const commit = useCallback((next) => {
    queueRef.current = next;
    saveQueue(next);
    setQueue(next);
  }, []);

  const enqueue = useCallback(
    (capture) => {
      const item = {
        id: "cap-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        status: "pending",
        created_at: new Date().toISOString(),
        ...capture,
      };
      commit([item, ...queueRef.current]);
      return item;
    },
    [commit]
  );

  const removeItem = useCallback(
    (id) => commit(queueRef.current.filter((it) => it.id !== id)),
    [commit]
  );

  const flush = useCallback(async () => {
    if (!online || syncing) return;
    const pending = queueRef.current.filter((it) => it.status === "pending" || it.status === "failed");
    if (!pending.length) return;

    setSyncing(true);
    for (const item of pending) {
      const mark = (patch) =>
        commit(queueRef.current.map((it) => (it.id === item.id ? { ...it, ...patch } : it)));
      mark({ status: "processing", error: undefined });
      try {
        const blob = await dataUrlToBlob(item.photoDataUrl);
        const up = await base44.integrations.Core.UploadPrivateFile({ file: blob });
        const res = await base44.functions.invoke("fieldCapture", {
          action: "processCapture",
          photo_uri: up.file_uri,
          latitude: item.latitude,
          longitude: item.longitude,
          location_name: item.location_name,
          notes: item.notes,
          captured_at: item.captured_at,
        });
        mark({ status: "processed", result: res.data, error: undefined });
        onProcessedRef.current?.(item.id, res.data);
      } catch (e) {
        mark({ status: "failed", error: e.message || "Upload failed" });
      }
    }
    setSyncing(false);
  }, [online, syncing, commit]);

  // Auto-flush whenever connectivity returns.
  useEffect(() => {
    if (online) flush();
  }, [online, flush]);

  return { queue, enqueue, removeItem, flush, syncing };
}