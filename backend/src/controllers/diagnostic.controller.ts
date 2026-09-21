import { Request, Response, NextFunction } from 'express';
import { diagnosticService } from '../services/diagnostics/diagnostic.service';

export async function getDiagnosticCatalogController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalog = diagnosticService.getCatalog();
    res.status(200).json({
      success: true,
      data: catalog,
      total: catalog.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function bookDiagnosticController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as any).user;
    const patientUid = user?.uid || req.body.patientUid || 'guest-patient';

    const booking = await diagnosticService.bookTest({
      ...req.body,
      patientUid,
    });

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Diagnostic test booked successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getFacilityRequestsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { facilityId } = req.params;
    const bookings = await diagnosticService.getFacilityRequests(facilityId);

    res.status(200).json({
      success: true,
      data: bookings,
      total: bookings.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadDiagnosticReportController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { reportUrl, reportSummary, status } = req.body;

    const updated = await diagnosticService.uploadReport(id, {
      reportUrl,
      reportSummary,
      status,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Diagnostic report updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getPatientBookingsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as any).user;
    const patientUid = user?.uid || (req.query.patientUid as string) || 'user-patient-1';

    const bookings = await diagnosticService.getPatientBookings(patientUid);

    res.status(200).json({
      success: true,
      data: bookings,
      total: bookings.length,
    });
  } catch (err) {
    next(err);
  }
}
