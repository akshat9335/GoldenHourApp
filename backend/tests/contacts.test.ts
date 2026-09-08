import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUserGet,
  mockContactGet,
  mockContactSet,
  mockContactDelete,
  mockFirestore,
} = vi.hoisted(() => {
  const mockUserGet = vi.fn();
  const mockContactGet = vi.fn();
  const mockContactSet = vi.fn();
  const mockContactDelete = vi.fn();

  const mockFirestore = {
    collection: vi.fn((collectionName: string) => {
      if (collectionName === "users") {
        return {
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: mockUserGet,
            })),
          })),
        };
      }

      return {
        doc: vi.fn((id?: string) => ({
          id: id ?? "contact-123",
          get: mockContactGet,
          set: mockContactSet,
          delete: mockContactDelete,
        })),
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: mockContactGet,
            })),
          })),
          get: vi.fn(() => mockContactGet()),
        })),
      };
    }),
  };

  return {
    mockUserGet,
    mockContactGet,
    mockContactSet,
    mockContactDelete,
    mockFirestore,
  };
});

vi.mock("../src/config/firebase", () => ({
  firestore: mockFirestore,
}));

import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
} from "../src/services/contacts/contact.service";

describe("Emergency Contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockContactSet.mockResolvedValue(undefined);
    mockContactDelete.mockResolvedValue(undefined);
  });

  it("adds an emergency contact using a valid Crisis ID", async () => {
    mockUserGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "contact-user-123",
          data: () => ({
            uid: "contact-user-123",
            crisisId: "AB-1234",
            name: "Test User",
            email: "test@example.com",
          }),
        },
      ],
    });

    mockContactGet.mockResolvedValue({
      empty: true,
      docs: [],
    });

    const contact = await addEmergencyContact(
      "owner-user-123",
      "ab-1234",
    );

    expect(contact.crisisId).toBe("AB-1234");
    expect(contact.contactUid).toBe("contact-user-123");
    expect(contact.ownerUid).toBe("owner-user-123");

    expect(mockContactSet).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid Crisis ID", async () => {
    await expect(
      addEmergencyContact("owner-user-123", ""),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CRISIS_ID",
    });
  });

  it("rejects a Crisis ID that does not belong to any user", async () => {
    mockUserGet.mockResolvedValue({
      empty: true,
      docs: [],
    });

    await expect(
      addEmergencyContact("owner-user-123", "ZZ-9999"),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
  });

  it("does not allow a user to add themselves", async () => {
    mockUserGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "owner-user-123",
          data: () => ({
            uid: "owner-user-123",
            crisisId: "AS-1234",
            name: "Akshat",
          }),
        },
      ],
    });

    await expect(
      addEmergencyContact("owner-user-123", "AS-1234"),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "SELF_CONTACT_NOT_ALLOWED",
    });
  });

  it("rejects a duplicate emergency contact", async () => {
    mockUserGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "contact-user-123",
          data: () => ({
            uid: "contact-user-123",
            crisisId: "AB-1234",
            name: "Test User",
          }),
        },
      ],
    });

    mockContactGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "existing-contact",
          data: () => ({
            ownerUid: "owner-user-123",
            contactUid: "contact-user-123",
          }),
        },
      ],
    });

    await expect(
      addEmergencyContact("owner-user-123", "AB-1234"),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "CONTACT_ALREADY_EXISTS",
    });
  });

  it("gets emergency contacts for the current user", async () => {
    mockContactGet.mockResolvedValue({
      docs: [
        {
          id: "contact-1",
          data: () => ({
            ownerUid: "owner-user-123",
            contactUid: "user-1",
            crisisId: "AB-1234",
            name: "User One",
          }),
        },
      ],
    });

    const contacts = await getEmergencyContacts("owner-user-123");

    expect(contacts).toHaveLength(1);
    expect(contacts[0].crisisId).toBe("AB-1234");
    expect(contacts[0].name).toBe("User One");
  });

  it("deletes an emergency contact owned by the current user", async () => {
    mockContactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: "owner-user-123",
        contactUid: "user-1",
        crisisId: "AB-1234",
      }),
    });

    await deleteEmergencyContact(
      "owner-user-123",
      "contact-123",
    );

    expect(mockContactDelete).toHaveBeenCalledTimes(1);
  });

  it("rejects deleting a contact owned by another user", async () => {
    mockContactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: "another-user",
        contactUid: "user-1",
        crisisId: "AB-1234",
      }),
    });

    await expect(
      deleteEmergencyContact(
        "owner-user-123",
        "contact-123",
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });
});