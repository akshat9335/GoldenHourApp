export type DriverVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type DriverAvailability = "AVAILABLE" | "BUSY" | "OFFLINE";

export interface Driver {
  uid: string;
  name: string;
  phone: string;
  licenseNumber: string;
  verificationStatus: DriverVerificationStatus;
  availability: DriverAvailability;
  createdAt: string;
  updatedAt: string;
}
