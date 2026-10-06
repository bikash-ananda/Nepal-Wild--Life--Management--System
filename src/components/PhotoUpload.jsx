import React, { useState } from "react";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function PhotoUpload({ value = [], onChange, label = "Photos", multiple = true }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of Array.from(files)) {
      try {
        const res = await base44.integrations.Core.UploadFile({ file });
        if (res.file_url) urls.push(res.file_url);
      } catch {}
    }
    onChange([...value, ...urls]);
    setUploading(false);
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {value.map((url, i) => (
          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}
        <label className={cn(
          "w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors",
          uploading && "pointer-events-none"
        )}>
          {uploading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4 text-slate-400" />
          )}
          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{label}</p>
    </div>
  );
}