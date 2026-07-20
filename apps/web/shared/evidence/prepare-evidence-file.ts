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
  const geolocationPromise = options.captureGps ? getCurrentPosition() : Promise.resolve(null);

  let preparedFile = file;

  if (options.timestampWatermark) {
    preparedFile = await applyPhotoWatermark(preparedFile, {
      timestamp: new Date(),
      timezone: options.timezone,
      outletName: options.outletName,
    });
  }

  const geolocation = await geolocationPromise;

  return {
    file: preparedFile,
    geolocation,
  };
}
