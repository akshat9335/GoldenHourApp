import { Request, Response, NextFunction } from "express";
import { registerDriver, getDriver, updateDriver, updateDriverAvailability } from "../services/ambulance/driver.service";
import { registerAmbulance } from "../services/ambulance/ambulance.service";
import { createTripFromAssignment } from "../services/ambulance/trip.service";
import { AppError } from "../utils/AppError";
import {
  getAmbulanceRequests,
  getAmbulanceRequest,
} from "../services/ambulance/request.service";

export async function registerDriverController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const driver = await registerDriver(req.user.uid, {
      name: req.body.name,
      phone: req.body.phone,
      licenseNumber: req.body.licenseNumber,
    });

    res.status(201).json({
      success: true,
      data: driver,
      message: "Driver registered successfully.",
    });
  } catch (error) {
    next(error);
  }
}


export async function getDriverController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const driver = await getDriver(req.user.uid);

    res.status(200).json({
      success: true,
      data: driver,
      message: "Driver profile fetched successfully.",
    });
  } catch (error) {
    next(error);
  }
}


export async function updateDriverAvailabilityController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const driver = await updateDriverAvailability(
      req.user.uid,
      req.body.availability,
    );

    res.status(200).json({
      success: true,
      data: driver,
      message: "Driver availability updated successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDriverController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const driver = await updateDriver(req.user.uid, {
      name: req.body.name,
      phone: req.body.phone,
      licenseNumber: req.body.licenseNumber,
    });

    res.status(200).json({
      success: true,
      data: driver,
      message: "Driver profile updated successfully.",
    });
  } catch (error) {
    next(error);
  }
}


export async function registerAmbulanceController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const ambulanceId = await registerAmbulance({
      ambulanceId: req.body.ambulanceId,
      vehicleNumber: req.body.vehicleNumber,
      driverId: req.user.uid,
      hospitalId: req.body.hospitalId,
      type: req.body.type,
    });

    res.status(201).json({
      success: true,
      data: { ambulanceId },
      message: "Ambulance registered successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function assignAmbulanceController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const { assignAmbulance } = await import(
      "../services/ambulance/assignment.service"
    );

    const assignmentId = await assignAmbulance(
      req.body.ambulanceId,
      req.params.id,
      req.body.patientId,
      req.user.uid,
    );

    const tripId = await createTripFromAssignment(assignmentId);

    res.status(201).json({
      success: true,
      data: { assignmentId, tripId },
      message: "Ambulance assigned and trip created successfully.",
    });
  } catch (error) {
    next(error);
  }
}


export async function getAmbulanceRequestsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const requests = await getAmbulanceRequests();

    res.status(200).json({
      success: true,
      data: requests,
      message: "Ambulance requests fetched successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function getAmbulanceRequestController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const request = await getAmbulanceRequest(req.params.id);

    res.status(200).json({
      success: true,
      data: request,
      message: "Ambulance request fetched successfully.",
    });
  } catch (error) {
    next(error);
  }
}
