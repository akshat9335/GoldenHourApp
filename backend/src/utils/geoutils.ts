/**
 * Geolocation and Routing mathematical utility functions.
 */

/**
 * Validates that latitude is between -90 and 90, and longitude is between -180 and 180.
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Calculates Great-Circle distance between two points using the Haversine formula (in kilometers).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(2));
}

/**
 * Estimates driving travel duration in minutes based on distance and standard urban driving conditions.
 * Applies a 1.35x road curvature/winding factor over straight-line Haversine distance.
 */
export function estimateDrivingDuration(distanceKm: number, avgSpeedKmh = 30): number {
  const estimatedRoadKm = distanceKm * 1.35;
  const hours = estimatedRoadKm / avgSpeedKmh;
  const minutes = Math.ceil(hours * 60);
  return Math.max(2, minutes); // Minimum 2 minutes
}

/**
 * Fuzzes coordinates slightly (approx 200-400m) to preserve patient privacy for public nearby incident feeds.
 */
export function fuzzCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  // 0.003 degrees is approximately 330 meters
  const deltaLat = 0.0025;
  const deltaLng = 0.0025;
  return {
    lat: Number((lat + deltaLat).toFixed(4)),
    lng: Number((lng + deltaLng).toFixed(4)),
  };
}

/**
 * Converts "HH:MM" 24-hour string to minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  return hours * 60 + mins;
}

/**
 * Converts minutes from midnight back to "HH:MM" 24-hour string.
 */
export function formatMinutesToTime(totalMinutes: number): string {
  let normalized = totalMinutes % 1440;
  if (normalized < 0) normalized += 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const hh = hours.toString().padStart(2, "0");
  const mm = mins.toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
