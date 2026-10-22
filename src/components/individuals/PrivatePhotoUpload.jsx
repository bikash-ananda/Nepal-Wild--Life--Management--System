import React, { useState } from "react";
import { X, Loader2, ImagePlus } from "lucide-react";
import { api } from "@/api/apiClient";
import { cn } from "@/lib/utils";
import PrivateImage from "@/components/PrivateImage";

// Like PhotoUpload, but stores files PRIVATELY (UploadPrivateFile) and keeps file_uris.
export default function PrivatePhotoUpload({ value = [], onChange, label = "Reference photos", max = 3 }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    const remaining = max - value.length;
    if (remaining <= 0) return;
    setUploading(true);
    const uris = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      try {
        const res = await api.integrations.Core.UploadPrivateFile({ file });
        if (res.file_uri) uris.push(res.file_uri);
      } catch {
        /* skip failed file */
      }
    }
    onChange([...value, ...uris]);
    setUploading(false);
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {value.map((uri, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group bg-slate-100">
            <PrivateImage fileUri={uri} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label
            className={cn(
              "w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors",
              uploading && "pointer-events-none"
            )}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4 text-slate-400" />
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">
        {label} · {value.length}/{max} · stored privately
      </p>
    </div>
  );
}