import { Request, Response, NextFunction } from "express";
import { verificationService, VerifiableRole } from "../services/admin/verification.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { VerificationStatus } from "../types/express";

export class AdminController {
  public async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.query.role as VerifiableRole | undefined;
      const status = req.query.status as VerificationStatus | undefined;

      const applications = await verificationService.listApplications({ role, status });
      sendSuccess(res, applications, "Applications retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  public async getPendingDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctors = await verificationService.listPendingDoctors();
      sendSuccess(res, doctors, "Pending doctors retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  public async verifyDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorId = req.params.id;
      const rawDecision = (req.body.status || req.body.decision || "").toUpperCase();

      if (!["APPROVED", "REJECTED"].includes(rawDecision)) {
        throw new AppError(400, "INVALID_STATUS", "Status must be 'APPROVED' or 'REJECTED'.");
      }

      const updated = await verificationService.verifyApplication(
        "DOCTOR",
        doctorId,
        rawDecision as "APPROVED" | "REJECTED",
        req.body.notes
      );

      sendSuccess(res, updated, `Doctor ${doctorId} verification status updated to ${rawDecision}`);
    } catch (err) {
      next(err);
    }
  }

  public async verifyApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.params.role?.toUpperCase() as VerifiableRole;
      const id = req.params.id;
      const rawDecision = (req.body.status || req.body.decision || "").toUpperCase();

      if (!["APPROVED", "REJECTED"].includes(rawDecision)) {
        throw new AppError(400, "INVALID_STATUS", "Status must be 'APPROVED' or 'REJECTED'.");
      }

      const updated = await verificationService.verifyApplication(
        role,
        id,
        rawDecision as "APPROVED" | "REJECTED",
        req.body.notes
      );

      sendSuccess(res, updated, `${role} ${id} verification updated to ${rawDecision}`);
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
