export interface IncidentConfirmation {
  confirmationId: string;
  emergencyId: string;
  userId: string;
  confirmedAt: string;
  createdAt: string;
}

export interface ConfirmEmergencyInput {
  emergencyId: string;
}

export interface ConfirmationResult {
  emergencyId: string;
  confirmed: boolean;
  confirmationCount: number;
  status: string;
  confirmationId: string;
  confirmedAt: string;
}

export interface ConfirmationSummary {
  emergencyId: string;
  confirmationCount: number;
  status: string;
}

export interface UserConfirmationStatus {
  emergencyId: string;
  confirmed: boolean;
  confirmedAt?: string | null;
}
