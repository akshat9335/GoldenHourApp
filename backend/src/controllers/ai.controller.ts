import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../utils/response";
import { analyzeEmergency } from "../services/ai/aiService";
import { analyzeImage } from "../services/ai/imageAnalysisService";
import { getFirstAid } from "../services/ai/firstAidService";

export async function triage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await analyzeEmergency(req.body), "AI triage completed");
  } catch (error) {
    next(error);
  }
}

export async function imageAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(res, await analyzeImage(req.body), "Image analysis completed");
  } catch (error) {
    next(error);
  }
}

export async function firstAid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, getFirstAid(req.body), "First-aid guidance generated");
  } catch (error) {
    next(error);
  }
}
