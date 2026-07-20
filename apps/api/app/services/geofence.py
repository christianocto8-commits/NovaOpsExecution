from __future__ import annotations

import math


def haversine_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    radius = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def is_within_geofence(
    *,
    submitter_lat: float | None,
    submitter_lon: float | None,
    outlet_lat: float | None,
    outlet_lon: float | None,
    radius_meters: int,
) -> tuple[bool, str | None]:
    if outlet_lat is None or outlet_lon is None:
        return True, None

    if submitter_lat is None or submitter_lon is None:
        return False, "GPS location is required to submit from this outlet."

    distance = haversine_distance_meters(
        submitter_lat,
        submitter_lon,
        outlet_lat,
        outlet_lon,
    )

    if distance <= max(25, radius_meters):
        return True, None

    return False, (
        f"You are {int(distance)}m from the outlet. "
        f"Move within {radius_meters}m to submit."
    )
