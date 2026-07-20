import type { GeolocationResult } from "./geolocation";

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const radius = 6_371_000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
}

export function checkGeofencePrecheck(args: {
  submitter: GeolocationResult | null;
  outletLat: number | null | undefined;
  outletLon: number | null | undefined;
  radiusMeters: number;
}): string | null {
  const { submitter, outletLat, outletLon, radiusMeters } = args;

  if (outletLat == null || outletLon == null) {
    return null;
  }

  if (!submitter) {
    return "GPS location is required to submit from this outlet.";
  }

  const distance = haversineDistanceMeters(
    submitter.latitude,
    submitter.longitude,
    outletLat,
    outletLon
  );

  if (distance <= Math.max(25, radiusMeters)) {
    return null;
  }

  return `You are ${Math.round(distance)}m from the outlet. Move within ${radiusMeters}m to submit.`;
}
