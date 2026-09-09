import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const get = vi.fn();
  const set = vi.fn();

  const emergencyRef = {
    get,
    set,
  };

  const collection = vi.fn(() => ({
    doc: vi.fn(() => emergencyRef),
  }));

  return {
    get,
    set,
    collection,
    emergencyRef,
  };
});

vi.mock("../src/config/firebase", () => ({
  firestore: {
    collection: mocks.collection,
  },
}));

import { syncEmergencyState } from "../src/services/sync/sync.service";

describe("Sync Service", () => {
  it("should sync emergency status successfully", async () => {
    mocks.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "EMG-001",
          status: "REPORTED",
          incidentType: "accident",
        }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "EMG-001",
          status: "HOSPITAL_SEARCH",
          incidentType: "accident",
        }),
      });

    const result = await syncEmergencyState({
      emergencyId: "EMG-001",
      status: "HOSPITAL_SEARCH",
    });

    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "HOSPITAL_SEARCH",
        updatedAt: expect.any(String),
      }),
      { merge: true },
    );

    expect(result.id).toBe("EMG-001");
    expect(result.status).toBe("HOSPITAL_SEARCH");
  });

  it("should merge multiple allowed updates without replacing existing data", async () => {
    mocks.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "EMG-002",
          status: "REPORTED",
          reporterId: "USER-001",
          crisisId: "AS-1234",
        }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "EMG-002",
          status: "EN_ROUTE",
          reporterId: "USER-001",
          crisisId: "AS-1234",
          severity: "high",
          description: "Accident near highway",
        }),
      });

    await syncEmergencyState({
      emergencyId: "EMG-002",
      status: "EN_ROUTE",
      updates: {
        severity: "high",
        description: "Accident near highway",
      },
    });

    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "EN_ROUTE",
        severity: "high",
        description: "Accident near highway",
        updatedAt: expect.any(String),
      }),
      { merge: true },
    );
  });

  it("should sync updates without changing status when status is not provided", async () => {
    mocks.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "EMG-003",
          status: "AMBULANCE_ASSIGNED",
        }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "EMG-003",
          status: "AMBULANCE_ASSIGNED",
          severity: "medium",
        }),
      });

    const result = await syncEmergencyState({
      emergencyId: "EMG-003",
      updates: {
        severity: "medium",
      },
    });

    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "medium",
        updatedAt: expect.any(String),
      }),
      { merge: true },
    );

    expect(result.status).toBe("AMBULANCE_ASSIGNED");
  });

  it("should reject an empty emergency ID", async () => {
    await expect(
      syncEmergencyState({
        emergencyId: "   ",
        status: "CONFIRMING",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_EMERGENCY_ID",
    });
  });

  it("should reject when no sync data is provided", async () => {
    await expect(
      syncEmergencyState({
        emergencyId: "EMG-004",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_SYNC_DATA",
    });
  });

  it("should return 404 when emergency does not exist", async () => {
    mocks.get.mockResolvedValueOnce({
      exists: false,
    });

    await expect(
      syncEmergencyState({
        emergencyId: "EMG-404",
        status: "HOSPITAL_SEARCH",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "EMERGENCY_NOT_FOUND",
    });
  });

  it("should not write protected emergency identity fields", async () => {
    mocks.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "EMG-005",
          reporterId: "USER-001",
          crisisId: "AS-1234",
          status: "REPORTED",
          createdAt: "original-time",
        }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "EMG-005",
          reporterId: "USER-001",
          crisisId: "AS-1234",
          status: "CONFIRMING",
          createdAt: "original-time",
          severity: "high",
        }),
      });

    await syncEmergencyState({
      emergencyId: "EMG-005",
      status: "CONFIRMING",
      updates: {
        severity: "high",
      },
    });

    const writtenData = mocks.set.mock.calls.at(-1)?.[0];

    expect(writtenData).not.toHaveProperty("id");
    expect(writtenData).not.toHaveProperty("reporterId");
    expect(writtenData).not.toHaveProperty("crisisId");
    expect(writtenData).not.toHaveProperty("createdAt");
  });
});