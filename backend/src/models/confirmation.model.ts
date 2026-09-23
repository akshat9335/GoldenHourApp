import { AppError } from "../utils/AppError";

export const INCIDENT_CONFIRMATIONS_COLLECTION = "incidentConfirmations";
export const EMERGENCIES_COLLECTION = "emergencies";

/**
 * Deterministically constructs a unique document ID for an incident confirmation
 * combining emergencyId and userId to prevent duplicate records.
 */
export function getConfirmationDocId(emergencyId: string, userId: string): string {
  return `${emergencyId}_${userId}`;
}

/**
 * Validates the emergencyId parameter and throws AppError(422) if invalid or missing.
 */
export function validateEmergencyId(emergencyId: unknown): string {
  if (!emergencyId || typeof emergencyId !== "string" || !emergencyId.trim()) {
    throw new AppError(422, "INVALID_INPUT", "A valid emergencyId is required.");
  }
  return emergencyId.trim();
}
