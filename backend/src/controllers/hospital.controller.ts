import { NextFunction, Request, Response } from "express";

import {
  addHospitalDiagnostic,
  addHospitalSpecialist,
  createHospitalReferral,
  deleteHospitalDiagnostic,
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
  HospitalReferralData,
  HospitalSpecialistData,
  registerHospital,
  updateHospitalCapacity,
  updateHospitalDiagnostic,
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
// HOSPITAL PROFILE
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

    const diagnosticId = req.params.id;

    const diagnostic = await getHospitalDiagnosticById(
      req.user.uid,
      diagnosticId,
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

    const diagnosticId = req.params.id;

    const diagnosticData: HospitalDiagnosticData = req.body;

    const diagnostic = await updateHospitalDiagnostic(
      req.user.uid,
      diagnosticId,
      diagnosticData,
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

    const diagnosticId = req.params.id;

    const result = await deleteHospitalDiagnostic(req.user.uid, diagnosticId);

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
// HOSPITAL REFERRAL - CREATE
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

    const requestId = req.params.id;

    const emergencyRequest = await getHospitalRequestById(
      req.user.uid,
      requestId,
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
