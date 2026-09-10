import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";

const USERS_COLLECTION = "users";
const CONTACTS_COLLECTION = "emergencyContacts";

export interface EmergencyContact {
  id: string;
  ownerUid: string;
  contactUid: string;
  crisisId: string;
  name?: string | null;
  email?: string | null;
  createdAt?: unknown;
}

function getFirestore() {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  return firestore;
}

export async function addEmergencyContact(
  ownerUid: string,
  crisisId: string,
): Promise<EmergencyContact> {
  const db = getFirestore();

  const normalizedCrisisId = crisisId.trim().toUpperCase();

  if (!normalizedCrisisId) {
    throw new AppError(
      400,
      "INVALID_CRISIS_ID",
      "Crisis ID is required.",
    );
  }

  const usersSnapshot = await db
    .collection(USERS_COLLECTION)
    .where("crisisId", "==", normalizedCrisisId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "No user was found with this Crisis ID.",
    );
  }

  const targetDoc = usersSnapshot.docs[0];
  const targetUser = targetDoc.data() as {
    uid?: string;
    crisisId?: string;
    name?: string;
    email?: string;
  };

  const contactUid = targetDoc.id;

  if (contactUid === ownerUid) {
    throw new AppError(
      400,
      "SELF_CONTACT_NOT_ALLOWED",
      "You cannot add yourself as an emergency contact.",
    );
  }

  const existingContact = await db
    .collection(CONTACTS_COLLECTION)
    .where("ownerUid", "==", ownerUid)
    .where("contactUid", "==", contactUid)
    .limit(1)
    .get();

  if (!existingContact.empty) {
    throw new AppError(
      409,
      "CONTACT_ALREADY_EXISTS",
      "This user is already an emergency contact.",
    );
  }

  const contactRef = db.collection(CONTACTS_COLLECTION).doc();

  const contact: EmergencyContact = {
    id: contactRef.id,
    ownerUid,
    contactUid,
    crisisId: normalizedCrisisId,
    name: targetUser.name ?? null,
    email: targetUser.email ?? null,
    createdAt: new Date().toISOString(),
  };

  await contactRef.set(contact);

  return contact;
}

export async function getEmergencyContacts(
  ownerUid: string,
): Promise<EmergencyContact[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection(CONTACTS_COLLECTION)
    .where("ownerUid", "==", ownerUid)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<EmergencyContact, "id">),
  }));
}

export async function deleteEmergencyContact(
  ownerUid: string,
  contactId: string,
): Promise<void> {
  const db = getFirestore();

  const contactRef = db
    .collection(CONTACTS_COLLECTION)
    .doc(contactId);

  const snapshot = await contactRef.get();

  if (!snapshot.exists) {
    throw new AppError(
      404,
      "CONTACT_NOT_FOUND",
      "Emergency contact was not found.",
    );
  }

  const contact = snapshot.data() as EmergencyContact;

  if (contact.ownerUid !== ownerUid) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You are not allowed to delete this emergency contact.",
    );
  }

  await contactRef.delete();
}