import { getCurrentPosition, type GeolocationResult } from "./geolocation";
import { applyPhotoWatermark } from "./photo-watermark";
import { compressImageFile } from "./image-compressor";

export type PrepareEvidenceFileOptions = {
  timestampWatermark?: boolean;
  captureGps?: boolean;
  timezone?: string;
  outletName?: string;
};

export type PreparedEvidenceFile = {
  file: File;
  geolocation: GeolocationResult | null;
};

export async function prepareEvidenceFile(
  file: File,
  options: PrepareEvidenceFileOptions = {}
): Promise<PreparedEvidenceFile> {
  const geolocationPromise = options.captureGps
    ? getCurrentPosition(4000)
    : Promise.resolve(null);

  const processImagePromise = (async () => {
    if (file.type.startsWith("image/")) {
      if (options.timestampWatermark) {
        try {
          return await applyPhotoWatermark(file, {
            timestamp: new Date(),
            timezone: options.timezone,
            outletName: options.outletName,
          });
        } catch {
          // Fallback safely to compression if watermark fails
          return await compressImageFile(file);
        }
      }

      // Always compress non-watermarked evidence images before upload
      return await compressImageFile(file);
    }
    return file;
  })();

  const [preparedFile, geolocation] = await Promise.all([processImagePromise, geolocationPromise]);

  return {
    file: preparedFile,
    geolocation,
  };
}
