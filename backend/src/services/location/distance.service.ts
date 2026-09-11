import { calculateHaversineDistance, estimateDrivingDuration } from "../../utils/geoutils";

export class DistanceService {
  /**
   * Calculates standardized distance in kilometers between two coordinates.
   */
  public calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return calculateHaversineDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Calculates estimated driving duration in minutes.
   */
  public calculateETA(distanceKm: number, avgSpeedKmh = 30): number {
    return estimateDrivingDuration(distanceKm, avgSpeedKmh);
  }
}

export const distanceService = new DistanceService();
