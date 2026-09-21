import { Request, Response, NextFunction } from "express";
import { registerDriver, getDriver, updateDriver, updateDriverAvailability } from "../services/ambulance/driver.service";
import { registerAmbulance } from "../services/ambulance/ambulance.service";
import { assignAmbulance } from "../services/ambulance/assignment.service";
import { createTripFromAssignment } from "../services/ambulance/trip.service";
import { AppError } from "../utils/AppError";
import {
  getAmbulanceRequests,
  getAmbulanceRequest,
  dismissAmbulanceRequest,
  clearAllAmbulanceRequests,
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

    let ambulanceId = req.body?.ambulanceId;
    if (!ambulanceId) {
      try {
        const driver = await getDriver(req.user.uid);
        ambulanceId = (driver as any)?.ambulanceId || (driver as any)?.vehiclePlateNumber;
      } catch {}
      if (!ambulanceId) {
        ambulanceId = `AMB-${req.user.uid.slice(-4).toUpperCase()}`;
      }
    }

    const assignmentId = await assignAmbulance(
      ambulanceId,
      req.params.id,
      req.body?.patientId,
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

    const requests = await getAmbulanceRequests(req.user.uid);

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

export async function dismissAmbulanceRequestController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    await dismissAmbulanceRequest(req.params.id, req.user.uid);

    res.status(200).json({
      success: true,
      message: "Ambulance request dismissed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function clearAllAmbulanceRequestsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const count = await clearAllAmbulanceRequests(req.user.uid);

    res.status(200).json({
      success: true,
      data: { clearedCount: count },
      message: `${count} ambulance request(s) cleared successfully.`,
    });
  } catch (error) {
    next(error);
  }
}
