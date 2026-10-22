import React, { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";
import { api } from "@/api/apiClient";
import { cn } from "@/lib/utils";

// Module-level cache so repeated renders of the same private file reuse the signed URL.
const signedCache = new Map();

export default function PrivateImage({ fileUri, alt = "", className, fallbackClassName }) {
  const isUrl = fileUri && /^https?:\/\//.test(fileUri);
  const [src, setSrc] = useState(() => {
    if (!fileUri) return null;
    if (isUrl) return fileUri;
    return signedCache.get(fileUri) || null;
  });
  const [loading, setLoading] = useState(!src && !!fileUri);

  useEffect(() => {
    if (!fileUri) {
      setSrc(null);
      setLoading(false);
      return;
    }
    if (isUrl) {
      setSrc(fileUri);
      setLoading(false);
      return;
    }
    if (signedCache.has(fileUri)) {
      setSrc(signedCache.get(fileUri));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri })
      .then((res) => {
        const url = res?.signed_url || res?.file_url || null;
        if (url) signedCache.set(fileUri, url);
        if (!cancelled) {
          setSrc(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileUri, isUrl]);

  if (loading && !src) {
    return <div className={cn("bg-slate-100 animate-pulse", className)} />;
  }
  if (!src) {
    return (
      <div className={cn("bg-slate-100 flex items-center justify-center text-slate-300", className || fallbackClassName)}>
        <ImageOff className="w-5 h-5" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} />;
}