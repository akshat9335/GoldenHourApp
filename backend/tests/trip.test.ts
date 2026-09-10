import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../src/config/firebase", () => ({
  firestore: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: mockGet,
        update: mockUpdate,
      })),
      where: vi.fn(() => ({
        get: mockGet,
      })),
    })),
  },
  assertFirebaseReady: vi.fn(),
}));

import {
  transitionTrip,
  createTripFromAssignment,
} from "../src/services/ambulance/trip.service";

const baseTrip = {
  assignmentId: "assignment-001",
  emergencyId: "emergency-001",
  ambulanceId: "AMB001",
  driverId: "test-driver-001",
};

const mockAmbulance = {
  empty: false,
  docs: [
    {
      ref: {
        update: mockUpdate,
      },
    },
  ],
};

describe("Ambulance Trip Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves ASSIGNED trip to EN_ROUTE_TO_PATIENT", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ...baseTrip,
          status: "ASSIGNED",
        }),
      })
      .mockResolvedValueOnce(mockAmbulance);

    const trip = await transitionTrip(
      "trip-001",
      "EN_ROUTE_TO_PATIENT",
      "test-driver-001",
    );

    expect(trip.status).toBe("EN_ROUTE_TO_PATIENT");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("rejects an invalid trip transition", async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ...baseTrip,
        status: "ASSIGNED",
      }),
    });

    await expect(
      transitionTrip(
        "trip-001",
        "AT_PATIENT",
        "test-driver-001",
      ),
    ).rejects.toThrow(
      "Invalid trip transition: ASSIGNED -> AT_PATIENT.",
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects a trip update by another driver", async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ...baseTrip,
        driverId: "driver-owner-001",
        status: "ASSIGNED",
      }),
    });

    await expect(
      transitionTrip(
        "trip-001",
        "EN_ROUTE_TO_PATIENT",
        "different-driver-999",
      ),
    ).rejects.toThrow(
      "You are not authorized to update this trip.",
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("moves EN_ROUTE_TO_PATIENT to AT_PATIENT", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ...baseTrip,
          status: "EN_ROUTE_TO_PATIENT",
        }),
      })
      .mockResolvedValueOnce(mockAmbulance);

    const trip = await transitionTrip(
      "trip-001",
      "AT_PATIENT",
      "test-driver-001",
    );

    expect(trip.status).toBe("AT_PATIENT");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("moves AT_PATIENT to PATIENT_ONBOARD", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ...baseTrip,
          status: "AT_PATIENT",
        }),
      })
      .mockResolvedValueOnce(mockAmbulance);

    const trip = await transitionTrip(
      "trip-001",
      "PATIENT_ONBOARD",
      "test-driver-001",
    );

    expect(trip.status).toBe("PATIENT_ONBOARD");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("moves PATIENT_ONBOARD to EN_ROUTE_TO_HOSPITAL", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ...baseTrip,
          status: "PATIENT_ONBOARD",
        }),
      })
      .mockResolvedValueOnce(mockAmbulance);

    const trip = await transitionTrip(
      "trip-001",
      "EN_ROUTE_TO_HOSPITAL",
      "test-driver-001",
    );

    expect(trip.status).toBe("EN_ROUTE_TO_HOSPITAL");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("moves EN_ROUTE_TO_HOSPITAL to AT_HOSPITAL", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ...baseTrip,
          status: "EN_ROUTE_TO_HOSPITAL",
        }),
      })
      .mockResolvedValueOnce(mockAmbulance);

    const trip = await transitionTrip(
      "trip-001",
      "AT_HOSPITAL",
      "test-driver-001",
    );

    expect(trip.status).toBe("AT_HOSPITAL");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("moves AT_HOSPITAL to COMPLETED", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ...baseTrip,
          status: "AT_HOSPITAL",
        }),
      })
      .mockResolvedValueOnce(mockAmbulance);

    const trip = await transitionTrip(
      "trip-001",
      "COMPLETED",
      "test-driver-001",
    );

    expect(trip.status).toBe("COMPLETED");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("fetches trip history for the authenticated driver", async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "trip-002",
          data: () => ({
            ...baseTrip,
            status: "COMPLETED",
            completedAt: "2026-09-10T10:00:00.000Z",
          }),
        },
        {
          id: "trip-001",
          data: () => ({
            ...baseTrip,
            status: "AT_HOSPITAL",
            updatedAt: "2026-09-10T09:00:00.000Z",
          }),
        },
      ],
    });

    const { getTripHistory } =
      await import("../src/services/ambulance/trip.service");

    const trips = await getTripHistory("test-driver-001");

    expect(trips).toHaveLength(2);
    expect(trips[0].id).toBe("trip-002");
    expect(trips[0].status).toBe("COMPLETED");
    expect(trips[1].id).toBe("trip-001");
  });

it("rejects trip creation when assignment is not assignable", async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ...baseTrip,
        status: "completed",
      }),
    });

    await expect(
      createTripFromAssignment("assignment-001"),
    ).rejects.toThrow(
      "Assignment is not in an assignable state.",
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

});
