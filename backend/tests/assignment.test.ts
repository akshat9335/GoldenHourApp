import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockAdd = vi.fn();
const mockUpdate = vi.fn();
const mockGetDriver = vi.hoisted(() => vi.fn());

vi.mock("../src/config/firebase", () => ({
  firestore: {
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          get: mockGet,
        })),
        get: mockGet,
      })),
      add: mockAdd,
    })),
  },
  assertFirebaseReady: vi.fn(),
}));

vi.mock("../src/services/ambulance/driver.service", () => ({
  getDriver: mockGetDriver,
}));

import { assignAmbulance } from "../src/services/ambulance/assignment.service";

const verifiedAvailableDriver = {
  uid: "test-driver-001",
  name: "Test Driver",
  phone: "9999999999",
  licenseNumber: "LIC001",
  verificationStatus: "VERIFIED",
  availability: "AVAILABLE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Ambulance Assignment Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDriver.mockResolvedValue(verifiedAvailableDriver);
  });

  it("rejects duplicate assignment for the same emergency", async () => {
    mockGet
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            ref: {
              update: mockUpdate,
            },
            data: () => ({
              ambulanceId: "AMB001",
              driverId: "test-driver-001",
              status: "AVAILABLE",
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "existing-assignment",
            data: () => ({
              emergencyId: "emergency-001",
              status: "assigned",
            }),
          },
        ],
      });

    await expect(
      assignAmbulance(
        "AMB001",
        "emergency-001",
        "patient-001",
        "test-driver-001",
      ),
    ).rejects.toThrow(
      "Emergency is already assigned to an ambulance.",
    );

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects an unverified driver", async () => {
    mockGetDriver.mockResolvedValue({
      ...verifiedAvailableDriver,
      verificationStatus: "PENDING",
    });

    await expect(
      assignAmbulance(
        "AMB001",
        "emergency-002",
        "patient-002",
        "test-driver-001",
      ),
    ).rejects.toThrow(
      "Driver must be VERIFIED before accepting an ambulance assignment.",
    );

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects a busy driver", async () => {
    mockGetDriver.mockResolvedValue({
      ...verifiedAvailableDriver,
      availability: "BUSY",
    });

    await expect(
      assignAmbulance(
        "AMB001",
        "emergency-003",
        "patient-003",
        "test-driver-001",
      ),
    ).rejects.toThrow("Driver is not available.");

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects an unavailable ambulance", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          ref: {
            update: mockUpdate,
          },
          data: () => ({
            ambulanceId: "AMB001",
            driverId: "test-driver-001",
            status: "BUSY",
          }),
        },
      ],
    });

    await expect(
      assignAmbulance(
        "AMB001",
        "emergency-004",
        "patient-004",
        "test-driver-001",
      ),
    ).rejects.toThrow("Ambulance is not available.");

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects an ambulance assigned to another driver", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          ref: {
            update: mockUpdate,
          },
          data: () => ({
            ambulanceId: "AMB001",
            driverId: "another-driver-999",
            status: "AVAILABLE",
          }),
        },
      ],
    });

    await expect(
      assignAmbulance(
        "AMB001",
        "emergency-005",
        "patient-005",
        "test-driver-001",
      ),
    ).rejects.toThrow(
      "This ambulance is not assigned to the authenticated driver.",
    );

    expect(mockAdd).not.toHaveBeenCalled();
  });
});
