import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUserGet,
  mockEmergencyGet,
  mockEmergencySet,
  mockFirestore,
} = vi.hoisted(() => {
  const mockUserGet = vi.fn();
  const mockEmergencyGet = vi.fn();
  const mockEmergencySet = vi.fn();

  const mockFirestore = {
    collection: vi.fn((collectionName: string) => {
      if (collectionName === "users") {
        return {
          doc: vi.fn(() => ({
            get: mockUserGet,
          })),
        };
      }

      return {
        doc: vi.fn((id?: string) => ({
          id: id ?? "emergency-123",
          get: mockEmergencyGet,
          set: mockEmergencySet,
        })),
      };
    }),
  };

  return {
    mockUserGet,
    mockEmergencyGet,
    mockEmergencySet,
    mockFirestore,
  };
});

vi.mock("../src/config/firebase", () => ({
  firestore: mockFirestore,
}));

import {
  createEmergency,
  getEmergencyById,
  updateEmergency,
} from "../src/services/emergencies/emergency.service";

describe("Emergencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmergencySet.mockResolvedValue(undefined);
  });

  it("creates an emergency with a valid location", async () => {
    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "user-123",
        crisisId: "AS-1234",
      }),
    });

    const emergency = await createEmergency("user-123", {
      incidentType: "ACCIDENT",
      description: "Road accident",
      location: {
        latitude: 28.6139,
        longitude: 77.209,
      },
    });

    expect(emergency.id).toBe("emergency-123");
    expect(emergency.reporterId).toBe("user-123");
    expect(emergency.crisisId).toBe("AS-1234");
    expect(emergency.incidentType).toBe("ACCIDENT");
    expect(emergency.status).toBe("REPORTED");
    expect(emergency.confirmationCount).toBe(0);

    expect(mockEmergencySet).toHaveBeenCalledTimes(1);
  });

  it("allows a location-only emergency report", async () => {
    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "user-123",
        crisisId: "AS-1234",
      }),
    });

    const emergency = await createEmergency("user-123", {
      incidentType: "ACCIDENT",
      location: {
        latitude: 28.6139,
        longitude: 77.209,
      },
    });

    expect(emergency.location).toEqual({
      latitude: 28.6139,
      longitude: 77.209,
    });

    expect(emergency.description).toBeNull();
    expect(emergency.voiceTranscript).toBeNull();
    expect(emergency.imageUrl).toBeNull();
  });

  it("rejects an emergency without an incident type", async () => {
    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "user-123",
        crisisId: "AS-1234",
      }),
    });

    await expect(
      createEmergency("user-123", {
        incidentType: "",
        location: {
          latitude: 28.6139,
          longitude: 77.209,
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_INCIDENT_TYPE",
    });
  });

  it("rejects an emergency without a valid location", async () => {
    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "user-123",
        crisisId: "AS-1234",
      }),
    });

    await expect(
      createEmergency("user-123", {
        incidentType: "ACCIDENT",
        location: {
          latitude: 200,
          longitude: 77.209,
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_LOCATION",
    });
  });

  it("rejects an emergency when the reporter does not exist", async () => {
    mockUserGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    await expect(
      createEmergency("user-123", {
        incidentType: "ACCIDENT",
        location: {
          latitude: 28.6139,
          longitude: 77.209,
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
  });

  it("gets an emergency for its owner", async () => {
    mockEmergencyGet.mockResolvedValue({
      exists: true,
      id: "emergency-123",
      data: () => ({
        reporterId: "user-123",
        crisisId: "AS-1234",
        incidentType: "ACCIDENT",
        location: {
          latitude: 28.6139,
          longitude: 77.209,
        },
        status: "REPORTED",
        confirmationCount: 0,
      }),
    });

    const emergency = await getEmergencyById(
      "emergency-123",
      "user-123",
    );

    expect(emergency.id).toBe("emergency-123");
    expect(emergency.crisisId).toBe("AS-1234");
  });

  it("rejects access by another user", async () => {
    mockEmergencyGet.mockResolvedValue({
      exists: true,
      id: "emergency-123",
      data: () => ({
        reporterId: "another-user",
        crisisId: "AB-5678",
        incidentType: "ACCIDENT",
        status: "REPORTED",
        confirmationCount: 0,
      }),
    });

    await expect(
      getEmergencyById("emergency-123", "user-123"),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("returns not found for a missing emergency", async () => {
    mockEmergencyGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    await expect(
      getEmergencyById("missing-emergency", "user-123"),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "EMERGENCY_NOT_FOUND",
    });
  });

  it("updates an emergency owned by the current user", async () => {
    mockEmergencyGet.mockResolvedValue({
      exists: true,
      id: "emergency-123",
      data: () => ({
        reporterId: "user-123",
        crisisId: "AS-1234",
        incidentType: "ACCIDENT",
        description: null,
        status: "REPORTED",
        confirmationCount: 0,
        location: {
          latitude: 28.6139,
          longitude: 77.209,
        },
      }),
    });

    const emergency = await updateEmergency(
      "emergency-123",
      "user-123",
      {
        description: "Updated accident description",
      },
    );

    expect(emergency.description).toBe(
      "Updated accident description",
    );

    expect(mockEmergencySet).toHaveBeenCalledTimes(1);
  });

  it("allows access and update by assigned responders or privileged roles", async () => {
    mockEmergencyGet.mockResolvedValue({
      exists: true,
      id: "emergency-123",
      data: () => ({
        reporterId: "patient-1",
        crisisId: "AS-1234",
        incidentType: "ACCIDENT",
        assignedDriverId: "driver-1",
        assignedHospitalId: "hospital-1",
        status: "REPORTED",
        confirmationCount: 0,
      }),
    });

    // Assigned driver can read
    const forDriver = await getEmergencyById("emergency-123", "driver-1");
    expect(forDriver.id).toBe("emergency-123");

    // Assigned hospital can update
    const updatedByHospital = await updateEmergency(
      "emergency-123",
      "hospital-1",
      { status: "HOSPITAL_ACCEPTED" },
    );
    expect(updatedByHospital.status).toBe("HOSPITAL_ACCEPTED");

    // Admin role can read
    const forAdmin = await getEmergencyById("emergency-123", "admin-user", "admin");
    expect(forAdmin.id).toBe("emergency-123");
  });
});