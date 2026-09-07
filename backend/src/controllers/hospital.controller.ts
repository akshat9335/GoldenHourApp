import { NextFunction, Request, Response } from "express";
import {
  HospitalData,
  registerHospital,
} from "../services/hospital/hospital.service";

export async function registerHospitalController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const hospitalData: HospitalData = req.body;

    const hospital = await registerHospital(req.user.uid, hospitalData);

    res.status(201).json({
      success: true,
      data: hospital,
      message: "Hospital registered successfully",
    });
  } catch (error) {
    next(error);
  }
}
