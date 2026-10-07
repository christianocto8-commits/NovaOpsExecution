export type CompressImageOptions = {
  maxDimension?: number;
  quality?: number;
  minSizeToCompress?: number;
};

/**
 * Resizes and compresses image files client-side before upload or local storage.
 * Drastically reduces upload bandwidth and mobile memory consumption on slow outlet networks.
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  const {
    maxDimension = 1600,
    quality = 0.82,
    minSizeToCompress = 250 * 1024, // 250 KB
  } = options;

  // Only compress raster images; skip SVG, GIF, or non-image files
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  // Already tiny; no compression needed
  if (file.size <= minSizeToCompress) {
    return file;
  }

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Gagal membaca file gambar"));
      };

      img.src = objectUrl;
    });

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;

    if (!naturalWidth || !naturalHeight) {
      return file;
    }

    const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
    const targetWidth = Math.round(naturalWidth * scale);
    const targetHeight = Math.round(naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const outputType = "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, quality);
    });

    // If compression failed or resulted in a larger file (rare), keep the original
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const fileName =
      file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")
        ? file.name
        : `${baseName}.jpg`;

    return new File([blob], fileName, { type: outputType });
  } catch {
    // Graceful fallback to original file on any decoding error
    return file;
  }
}
