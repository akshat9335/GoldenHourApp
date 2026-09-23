import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
} from "../services/contacts/contact.service";

function getUserUid(req: Request): string {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication is required.",
    );
  }

  return req.user.uid;
}

export async function addContactController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uid = getUserUid(req);
    const { crisisId } = req.body;

    if (typeof crisisId !== "string" || !crisisId.trim()) {
      throw new AppError(
        400,
        "INVALID_CRISIS_ID",
        "Crisis ID is required.",
      );
    }

    const contact = await addEmergencyContact(uid, crisisId);

    sendSuccess(
      res,
      contact,
      "Emergency contact added successfully.",
      201,
    );
  } catch (err) {
    next(err);
  }
}

export async function getContactsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uid = getUserUid(req);

    const contacts = await getEmergencyContacts(uid);

    sendSuccess(
      res,
      contacts,
      "Emergency contacts retrieved successfully.",
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteContactController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uid = getUserUid(req);

    const { id } = req.params;

    if (!id) {
      throw new AppError(
        400,
        "INVALID_CONTACT_ID",
        "Contact ID is required.",
      );
    }

    await deleteEmergencyContact(uid, id);

    sendSuccess(
      res,
      null,
      "Emergency contact deleted successfully.",
    );
  } catch (err) {
    next(err);
  }
}