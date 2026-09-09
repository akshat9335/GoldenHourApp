import { NextFunction, Request, Response } from "express";

import {
  acceptHospitalRequest,
  addHospitalDiagnostic,
  addHospitalSpecialist,
  createHospitalReferral,
  createHospitalReferralForRequest,
  deleteHospitalDiagnostic,
  deleteHospitalSpecialist,
  FacilityMatchData,
  findMatchingFacilities,
  getHospitalCapacity,
  getHospitalDiagnosticById,
  getHospitalDiagnostics,
  getHospitalProfile,
  getHospitalReferrals,
  getHospitalRequestById,
  getHospitalRequests,
  getHospitalSpecialists,
  HospitalCapacityData,
  HospitalDiagnosticData,
  HospitalEmergencyRequestStatus,
  HospitalReferralData,
  HospitalReferralRequestData,
  HospitalSpecialistData,
  registerHospital,
  rejectHospitalRequest,
  updateHospitalCapacity,
  updateHospitalDiagnostic,
  updateHospitalProfile,
  updateHospitalRequestStatus,
  updateHospitalSpecialist,
} from "../services/hospital/hospital.service";

import { AppError } from "../utils/AppError";

// ============================================================
// HOSPITAL REGISTRATION
// ============================================================

export async function registerHospitalController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const hospital = await registerHospital(req.user.uid, req.body);

    res.status(201).json({
      success: true,
      data: hospital,
      message: "Hospital registered successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL PROFILE - GET
// ============================================================

export async function getHospitalProfileController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const profile = await getHospitalProfile(req.user.uid);

    res.status(200).json({
      success: true,
      data: profile,
      message: "Hospital profile fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL PROFILE - UPDATE
// ============================================================

export async function updateHospitalProfileController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const profile = await updateHospitalProfile(req.user.uid, req.body);

    res.status(200).json({
      success: true,
      data: profile,
      message: "Hospital profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL CAPACITY - GET
// ============================================================

export async function getHospitalCapacityController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const capacity = await getHospitalCapacity(req.user.uid);

    res.status(200).json({
      success: true,
      data: capacity,
      message: "Hospital capacity fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL CAPACITY - UPDATE
// ============================================================

export async function updateHospitalCapacityController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const capacityData: HospitalCapacityData = req.body;

    const capacity = await updateHospitalCapacity(req.user.uid, capacityData);

    res.status(200).json({
      success: true,
      data: capacity,
      message: "Hospital capacity updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL SPECIALISTS - GET
// ============================================================

export async function getHospitalSpecialistsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const specialists = await getHospitalSpecialists(req.user.uid);

    res.status(200).json({
      success: true,
      data: specialists,
      message: "Hospital specialists fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL SPECIALISTS - ADD
// ============================================================

export async function addHospitalSpecialistController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const specialistData: HospitalSpecialistData = req.body;

    const specialist = await addHospitalSpecialist(
      req.user.uid,
      specialistData,
    );

    res.status(201).json({
      success: true,
      data: specialist,
      message: "Hospital specialist added successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL SPECIALISTS - UPDATE
// ============================================================

export async function updateHospitalSpecialistController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const specialist = await updateHospitalSpecialist(
      req.user.uid,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: specialist,
      message: "Hospital specialist updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL SPECIALISTS - DELETE
// ============================================================

export async function deleteHospitalSpecialistController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const result = await deleteHospitalSpecialist(req.user.uid, req.params.id);

    res.status(200).json({
      success: true,
      data: result,
      message: "Hospital specialist deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL DIAGNOSTICS - GET ALL
// ============================================================

export async function getHospitalDiagnosticsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const diagnostics = await getHospitalDiagnostics(req.user.uid);

    res.status(200).json({
      success: true,
      data: diagnostics,
      message: "Hospital diagnostics fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL DIAGNOSTIC - GET BY ID
// ============================================================

export async function getHospitalDiagnosticByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const diagnostic = await getHospitalDiagnosticById(
      req.user.uid,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: diagnostic,
      message: "Hospital diagnostic fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL DIAGNOSTICS - ADD
// ============================================================

export async function addHospitalDiagnosticController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const diagnosticData: HospitalDiagnosticData = req.body;

    const diagnostic = await addHospitalDiagnostic(
      req.user.uid,
      diagnosticData,
    );

    res.status(201).json({
      success: true,
      data: diagnostic,
      message: "Hospital diagnostic added successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL DIAGNOSTICS - UPDATE
// ============================================================

export async function updateHospitalDiagnosticController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const diagnostic = await updateHospitalDiagnostic(
      req.user.uid,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: diagnostic,
      message: "Hospital diagnostic updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL DIAGNOSTICS - DELETE
// ============================================================

export async function deleteHospitalDiagnosticController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const result = await deleteHospitalDiagnostic(req.user.uid, req.params.id);

    res.status(200).json({
      success: true,
      data: result,
      message: "Hospital diagnostic deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// FACILITY MATCHING
// ============================================================

export async function findMatchingFacilitiesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const criteria: FacilityMatchData = req.body;

    const matches = await findMatchingFacilities(req.user.uid, criteria);

    res.status(200).json({
      success: true,
      data: matches,
      message: "Matching facilities fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL REFERRAL - EXISTING CREATE
// ============================================================

export async function createHospitalReferralController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const referralData: HospitalReferralData = req.body;

    const referral = await createHospitalReferral(req.user.uid, referralData);

    res.status(201).json({
      success: true,
      data: referral,
      message: "Hospital referral created successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL REFERRAL - CREATE FOR REQUEST
// ============================================================

export async function createHospitalReferralForRequestController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const referralData: HospitalReferralRequestData = req.body;

    const referral = await createHospitalReferralForRequest(
      req.user.uid,
      req.params.id,
      referralData,
    );

    res.status(201).json({
      success: true,
      data: referral,
      message: "Emergency request referral created successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL REFERRALS - GET ALL
// ============================================================

export async function getHospitalReferralsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const referrals = await getHospitalReferrals(req.user.uid);

    res.status(200).json({
      success: true,
      data: referrals,
      message: "Hospital referrals fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL EMERGENCY REQUESTS - GET ALL
// ============================================================

export async function getHospitalRequestsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const requests = await getHospitalRequests(req.user.uid);

    res.status(200).json({
      success: true,
      data: requests,
      message: "Hospital emergency requests fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - GET BY ID
// ============================================================

export async function getHospitalRequestByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const emergencyRequest = await getHospitalRequestById(
      req.user.uid,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: emergencyRequest,
      message: "Hospital emergency request fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - ACCEPT
// ============================================================

export async function acceptHospitalRequestController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const emergencyRequest = await acceptHospitalRequest(
      req.user.uid,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: emergencyRequest,
      message: "Emergency request accepted successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - REJECT
// ============================================================

export async function rejectHospitalRequestController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const reason =
      typeof req.body?.reason === "string" ? req.body.reason : undefined;

    const emergencyRequest = await rejectHospitalRequest(
      req.user.uid,
      req.params.id,
      reason,
    );

    res.status(200).json({
      success: true,
      data: emergencyRequest,
      message: "Emergency request rejected successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - UPDATE STATUS
// ============================================================

export async function updateHospitalRequestStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const status = req.body?.status as HospitalEmergencyRequestStatus;

    const emergencyRequest = await updateHospitalRequestStatus(
      req.user.uid,
      req.params.id,
      status,
    );

    res.status(200).json({
      success: true,
      data: emergencyRequest,
      message: "Emergency request status updated successfully",
    });
  } catch (error) {
    next(error);
  }
}
