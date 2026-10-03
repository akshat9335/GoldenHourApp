import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../utils/response";
import { analyzeEmergency, analyzeVoiceEmergency } from "../services/ai/aiService";
import { analyzeImage } from "../services/ai/imageAnalysisService";
import { getFirstAid } from "../services/ai/firstAidService";
import { validateEmergencyInput } from "../services/ai/aiValidator";

export async function triage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await analyzeEmergency(req.body), "AI triage completed");
  } catch (error) {
    next(error);
  }
}

export async function voiceTriage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyzeVoiceEmergency(req.body);
    sendSuccess(res, result, "Voice AI emergency analysis completed");
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

export async function validateInput(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validated = validateEmergencyInput(req.body);
    sendSuccess(res, validated, "AI input validated successfully");
  } catch (error) {
    next(error);
  }
}
