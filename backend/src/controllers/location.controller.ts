import { Request, Response, NextFunction } from "express";
import { locationService } from "../services/location/location.service";
import { mapsService } from "../services/location/maps.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { validateCoordinates } from "../utils/geoutils";

export class LocationController {
  public async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, accuracy, timestamp, role, userId } = req.body;
      const targetUserId = userId || req.user?.uid;

      if (!targetUserId) {
        throw new AppError(400, "MISSING_USER_ID", "User ID is required to update location.");
      }

      if (typeof lat !== "number" || typeof lng !== "number") {
        throw new AppError(400, "INVALID_INPUT", "Numeric 'lat' and 'lng' are required.");
      }

      const updated = await locationService.updateUserLocation({
        userId: targetUserId,
        lat,
        lng,
        accuracy,
        timestamp,
        role,
      });

      sendSuccess(res, updated, "Location updated successfully");
    } catch (err) {
      next(err);
    }
  }

  public async getNearbyHospitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = req.query.radius ? parseFloat(req.query.radius as string) : 25;

      if (!validateCoordinates(lat, lng)) {
        throw new AppError(400, "INVALID_COORDINATES", "Query parameters 'lat' and 'lng' must be valid coordinates.");
      }

      const hospitals = await locationService.getNearbyHospitals(lat, lng, radius);
      sendSuccess(res, hospitals, `Found ${hospitals.length} nearby hospitals within ${radius} km`);
    } catch (err) {
      next(err);
    }
  }

  public async getNearbyIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = req.query.radius ? parseFloat(req.query.radius as string) : 15;

      if (!validateCoordinates(lat, lng)) {
        throw new AppError(400, "INVALID_COORDINATES", "Query parameters 'lat' and 'lng' must be valid coordinates.");
      }

      const incidents = await locationService.getNearbyIncidents(lat, lng, radius);
      sendSuccess(res, incidents, `Found ${incidents.length} nearby incidents within ${radius} km`);
    } catch (err) {
      next(err);
    }
  }

  public async getRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const originLat = parseFloat(req.query.originLat as string);
      const originLng = parseFloat(req.query.originLng as string);
      const destLat = parseFloat(req.query.destLat as string);
      const destLng = parseFloat(req.query.destLng as string);

      if (!validateCoordinates(originLat, originLng) || !validateCoordinates(destLat, destLng)) {
        throw new AppError(400, "INVALID_COORDINATES", "Valid originLat, originLng, destLat, and destLng are required.");
      }

      const route = await mapsService.getRoute(
        { lat: originLat, lng: originLng },
        { lat: destLat, lng: destLng }
      );

      sendSuccess(res, route, "Route calculated successfully");
    } catch (err) {
      next(err);
    }
  }
}

export const locationController = new LocationController();
