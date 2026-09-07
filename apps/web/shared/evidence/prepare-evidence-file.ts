import { getCurrentPosition, type GeolocationResult } from "./geolocation";
import { applyPhotoWatermark } from "./photo-watermark";

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

  const watermarkPromise = (async () => {
    if (options.timestampWatermark && file.type.startsWith("image/")) {
      try {
        return await applyPhotoWatermark(file, {
          timestamp: new Date(),
          timezone: options.timezone,
          outletName: options.outletName,
        });
      } catch {
        // Fallback safely to original file if canvas/image decoding fails
        return file;
      }
    }
    return file;
  })();

  const [preparedFile, geolocation] = await Promise.all([watermarkPromise, geolocationPromise]);

  return {
    file: preparedFile,
    geolocation,
  };
}
