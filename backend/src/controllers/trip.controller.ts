import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import {
  transitionTrip,
  getTripHistory,
  cancelTripAsFalseAlarm,
} from "../services/ambulance/trip.service";

async function updateTripStatus(
  req: Request,
  res: Response,
  next: NextFunction,
  status:
    | "EN_ROUTE_TO_PATIENT"
    | "AT_PATIENT"
    | "PATIENT_ONBOARD"
    | "EN_ROUTE_TO_HOSPITAL"
    | "AT_HOSPITAL"
    | "COMPLETED",
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication is required.",
      );
    }

    const trip = await transitionTrip(req.params.id, status, req.user.uid);

    res.status(200).json({
      success: true,
      data: trip,
      message: `Trip status updated to ${status}.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function startToPatientController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await updateTripStatus(req, res, next, "EN_ROUTE_TO_PATIENT");
}

export async function arrivedPatientController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await updateTripStatus(req, res, next, "AT_PATIENT");
}

export async function pickupController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await updateTripStatus(req, res, next, "PATIENT_ONBOARD");
}

export async function startToHospitalController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await updateTripStatus(req, res, next, "EN_ROUTE_TO_HOSPITAL");
}

export async function arrivedHospitalController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await updateTripStatus(req, res, next, "AT_HOSPITAL");
}

export async function completeTripController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await updateTripStatus(req, res, next, "COMPLETED");
}


export async function getTripHistoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication is required.",
      );
    }

    const trips = await getTripHistory(req.user.uid);

    res.status(200).json({
      success: true,
      data: trips,
      message: "Trip history fetched successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelTripController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }
    const { reason } = req.body || {};
    const result = await cancelTripAsFalseAlarm(
      req.params.id,
      req.user.uid,
      reason || "Patient not found / false alarm reported by pilot",
    );
    res.status(200).json({
      success: true,
      data: result,
      message: "Trip cancelled as false alarm / patient no-show. Trust penalty applied.",
    });
  } catch (error) {
    next(error);
  }
}
