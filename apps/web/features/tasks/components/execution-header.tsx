import React from 'react';
import { GeofenceStatusBanner } from "@/shared/evidence";
import { useLanguage } from "@/shared/i18n";

interface ExecutionHeaderProps {
  trainingBlocked: boolean;
  incompleteTrainingCount: number;
  geofenceEnabled: boolean;
  hasOutletCoords: boolean;
  outletLat?: number | null;
  outletLon?: number | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  geofenceDistanceMeters: number | null;
  geofenceRadius: number;
}

export const ExecutionHeader: React.FC<ExecutionHeaderProps> = ({
  trainingBlocked,
  incompleteTrainingCount,
  geofenceEnabled,
  hasOutletCoords,
  outletLat,
  outletLon,
  isLoadingLocation,
  locationError,
  geofenceDistanceMeters,
  geofenceRadius,
}) => {
  const { t } = useLanguage();

  if (!geofenceEnabled && incompleteTrainingCount === 0) {
    return null;
  }

  return (
    <div className="bg-white px-3 pb-3 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-2 sm:space-y-3">
        {(geofenceEnabled || incompleteTrainingCount > 0) && (
          <>
            {geofenceEnabled && (
              <GeofenceStatusBanner
                enabled={geofenceEnabled}
                hasOutletCoords={hasOutletCoords}
                outletLat={outletLat}
                outletLon={outletLon}
                isLoadingLocation={isLoadingLocation}
                locationError={locationError}
                distanceMeters={geofenceDistanceMeters}
                radiusMeters={geofenceRadius}
              />
            )}
            {incompleteTrainingCount > 0 && (
              <div
                className={`rounded-xl border px-3 py-2 text-xs sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
                  trainingBlocked
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {trainingBlocked
                  ? t("training.executionBlocked")
                  : t("training.executionWarning")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
