import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGet,
  mockSet,
  mockCreate,
  mockDelete,
  mockWhereGet,
  mockFirestore,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockCreate = vi.fn();
  const mockDelete = vi.fn();
  const mockWhereGet = vi.fn();

  const mockFirestore = {
    collection: vi.fn((collectionName: string) => {
      if (collectionName === "users") {
        return {
          doc: vi.fn(() => ({
            get: mockGet,
            set: mockSet,
          })),
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: mockWhereGet,
            })),
          })),
        };
      }

      return {
        doc: vi.fn(() => ({
          create: mockCreate,
          delete: mockDelete,
        })),
      };
    }),
  };

  return {
    mockGet,
    mockSet,
    mockCreate,
    mockDelete,
    mockWhereGet,
    mockFirestore,
  };
});

vi.mock("../src/config/firebase", () => ({
  firestore: mockFirestore,
}));

import { getOrCreateUserProfile } from "../src/services/users/user.service";

describe("Users - Crisis ID", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSet.mockResolvedValue(undefined);
    mockCreate.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);

    // By default, the generated ID does not already exist.
    mockWhereGet.mockResolvedValue({
      empty: true,
    });
  });

  it("generates a Crisis ID for a new user", async () => {
    mockGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    const user = await getOrCreateUserProfile(
      "user-123",
      "test@example.com",
    );

    expect(user.crisisId).toMatch(/^[A-Z]{2}-\d{4}$/);
    expect(user.uid).toBe("user-123");
    expect(user.email).toBe("test@example.com");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing Crisis ID for the same user", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "user-123",
        name: "Akshat Srivastava",
        email: "test@example.com",
        crisisId: "AS-1234",
        trustScore: 50,
      }),
    });

    const user = await getOrCreateUserProfile(
      "user-123",
      "test@example.com",
    );

    expect(user.crisisId).toBe("AS-1234");
    expect(user.trustScore).toBe(50);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("generates a Crisis ID when an existing user has no Crisis ID", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "user-123",
        name: "Akshat Srivastava",
        email: "test@example.com",
        trustScore: 50,
      }),
    });

    const user = await getOrCreateUserProfile(
      "user-123",
      "test@example.com",
    );

    expect(user.crisisId).toMatch(/^AS-\d{4}$/);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("generates another Crisis ID when the first ID is already used", async () => {
    mockGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    mockCreate
      .mockRejectedValueOnce({
        code: 6,
      })
      .mockResolvedValueOnce(undefined);

    const user = await getOrCreateUserProfile(
      "user-456",
      "test@example.com",
    );

    expect(user.crisisId).toMatch(/^[A-Z]{2}-\d{4}$/);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("rejects a Crisis ID that already exists in the old users collection", async () => {
    mockGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    mockWhereGet
      .mockResolvedValueOnce({
        empty: false,
      })
      .mockResolvedValueOnce({
        empty: true,
      });

    const user = await getOrCreateUserProfile(
      "user-789",
      "test@example.com",
    );

    expect(user.crisisId).toMatch(/^[A-Z]{2}-\d{4}$/);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
  });
});