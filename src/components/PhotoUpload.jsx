import React, { useState } from "react";
import { X, Loader2, ImagePlus } from "lucide-react";
import { api } from "@/api/apiClient";
import { preparePhotoUpload } from "@/lib/preparePhotoUpload";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/LanguageContext";

export default function PhotoUpload({ value = [], onChange, label, multiple = true }) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    let failed = 0;
    try {
      for (const file of Array.from(files)) {
        try {
          const prepared = await preparePhotoUpload(file);
          const res = await api.integrations.Core.UploadFile({ file: prepared });
          if (res.file_url) urls.push(res.file_url);
          else failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (urls.length) onChange([...value, ...urls]);
      if (failed) toast({ title: t("photos.uploadFailed"), description: t("photos.uploadFailedDetail", { uploaded: urls.length, failed }), variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
              aria-label={t("photos.remove")}
              title={t("photos.remove")}
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
            <ImagePlus className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={multiple}
            aria-label={t("photos.add")}
            className="hidden"
            onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; handleFiles(files); }}
          />
        </label>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{label || t("common.photos")}</p>
    </div>
  );
}
