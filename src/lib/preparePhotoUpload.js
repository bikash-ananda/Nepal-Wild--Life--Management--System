const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadPhoto(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).then((bitmap) => ({
      image: bitmap,
      dispose: () => bitmap.close?.(),
    }));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, dispose: () => URL.revokeObjectURL(url) });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo could not be opened by the browser."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("This browser could not prepare the photo for upload."));
    }, type, quality);
  });
}

export async function preparePhotoUpload(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  if (!acceptedTypes.has(file?.type)) {
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  }
  if (typeof document === "undefined") {
    throw new Error("Photo preparation is only available in a browser.");
  }

  const { image, dispose } = await loadPhoto(file);
  try {
    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;
    if (!width || !height) throw new Error("This photo has invalid dimensions.");

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo for upload.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Re-encoding strips camera EXIF, including embedded GPS coordinates.
    const outputType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await canvasBlob(canvas, outputType, quality);
    canvas.width = 0;
    canvas.height = 0;
    const actualType = blob.type || outputType;
    const extension = actualType === "image/jpeg" ? ".jpg" : actualType === "image/png" ? ".png" : ".webp";
    const safeName = (file.name || "wildlife-photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${safeName}${extension}`, { type: actualType, lastModified: file.lastModified || Date.now() });
  } finally {
    dispose();
  }
}
