import { Request, Response, NextFunction } from "express";
import { queueService } from "../services/doctor/queue.service";
import { sendSuccess } from "../utils/response";

export class QueueController {
  public async getLiveQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorId = req.params.doctorId;
      const patientToken = req.query.token ? parseInt(req.query.token as string, 10) : undefined;

      const queueView = await queueService.getLiveQueue(doctorId, patientToken);
      sendSuccess(res, queueView, "Live queue status retrieved");
    } catch (err) {
      next(err);
    }
  }

  public async advanceQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorId = req.params.doctorId;
      const updatedQueue = await queueService.advanceQueue(doctorId);
      sendSuccess(res, updatedQueue, `Called next patient: Serving token #${updatedQueue.servingToken}`);
    } catch (err) {
      next(err);
    }
  }

  public async resetQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorId = req.params.doctorId;
      const resetState = await queueService.resetQueue(doctorId);
      sendSuccess(res, resetState, "Doctor queue reset to 0");
    } catch (err) {
      next(err);
    }
  }
}

export const queueController = new QueueController();
