import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

// Mock Firebase Admin and Firestore for canonical emergency integration
const {
  mockFirestore,
  mockMessagingSendMulticast,
} = vi.hoisted(() => {
  const mockMessagingSendMulticast = vi.fn();
  const mockEmergencySet = vi.fn().mockResolvedValue(undefined);
  const mockUserGet = vi.fn().mockResolvedValue({
    exists: true,
    data: () => ({
      name: "Akshat",
      crisisId: "CRISIS-GH-9988",
    }),
  });

  const mockFirestore = {
    collection: vi.fn((col: string) => {
      if (col === "users") {
        return {
          doc: vi.fn(() => ({
            get: mockUserGet,
          })),
        };
      }
      if (col === "emergencies") {
        return {
          doc: vi.fn((id?: string) => ({
            id: id || "canonical-emg-voice-123",
            set: mockEmergencySet,
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                id: "canonical-emg-voice-123",
                reporterId: "test-user-1",
                crisisId: "CRISIS-GH-9988",
                incidentType: "Voice SOS Emergency",
                status: "REPORTED",
                location: { latitude: 28.6139, longitude: 77.2090 },
              }),
            }),
          })),
        };
      }
      return {
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: false }),
          set: vi.fn().mockResolvedValue(undefined),
        })),
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ docs: [] }),
        })),
        add: vi.fn().mockResolvedValue({ id: "notif-voice-1" }),
      };
    }),
  };

  return {
    mockFirestore,
    mockMessagingSendMulticast,
  };
});

vi.mock("../src/config/firebase", () => ({
  firestore: mockFirestore,
  messaging: {
    sendEachForMulticast: mockMessagingSendMulticast,
  },
}));

// Mock api client to connect directly to backend service
vi.mock("@/services/api", () => {
  return {
    api: {
      emergencies: {
        create: vi.fn(async (input: any) => {
          return {
            id: "canonical-emg-voice-123",
            incidentType: input.incidentType,
            description: input.description,
            location: input.location,
            crisisId: "CRISIS-GH-9988",
            status: "REPORTED",
          };
        }),
        getById: vi.fn(async (id: string) => ({
          id,
          incidentType: "Accident",
          status: "REPORTED",
          location: { latitude: 28.6139, longitude: 77.2090 },
        })),
        update: vi.fn(async (id: string, updates: any) => ({
          id,
          ...updates,
        })),
      },
    },
    getAuthToken: vi.fn(() => "test-token"),
  };
});

import { useAppStore } from "@/store/useAppStore";
import { voiceSosService, matchesCodePhrase, normalizeVoiceText } from "@/services/voiceSos.service";
import { triggerCanonicalEmergencySOS } from "@/services/emergency";
import { api } from "@/services/api";

describe("Voice SOS Module — Comprehensive Requirements Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset store to default state
    useAppStore.setState({
      voiceSosEnabled: false,
      voiceSosPhrase: "Blue Star",
      voiceSosCountdown: null,
      isVoiceListening: false,
      emergencyId: null,
    });
    voiceSosService.cancelCountdown();
    voiceSosService.stopListening();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. Voice SOS is default OFF", () => {
    const store = useAppStore.getState();
    expect(store.voiceSosEnabled).toBe(false);
    expect(store.voiceSosPhrase).toBe("Blue Star");
    expect(store.voiceSosCountdown).toBeNull();
    expect(voiceSosService.isListening()).toBe(false);
  });

  it("2. Enables Voice SOS and updates listening state", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    const success = await voiceSosService.setEnabled(true);

    expect(success).toBe(true);
    expect(useAppStore.getState().voiceSosEnabled).toBe(true);
    expect(voiceSosService.isListening()).toBe(true);
  });

  it("3. Disables Voice SOS and halts listening", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    await voiceSosService.setEnabled(true);
    expect(useAppStore.getState().voiceSosEnabled).toBe(true);

    await voiceSosService.setEnabled(false);
    expect(useAppStore.getState().voiceSosEnabled).toBe(false);
    expect(voiceSosService.isListening()).toBe(false);
  });

  it("4. Saves custom code phrase", () => {
    voiceSosService.setCodePhrase("Golden Shield");
    expect(useAppStore.getState().voiceSosPhrase).toBe("Golden Shield");
    expect(voiceSosService.getCodePhrase()).toBe("Golden Shield");
  });

  it("5. Changes custom code phrase to another custom phrase", () => {
    voiceSosService.setCodePhrase("Golden Shield");
    expect(voiceSosService.getCodePhrase()).toBe("Golden Shield");

    voiceSosService.setCodePhrase("My Emergency SOS");
    expect(voiceSosService.getCodePhrase()).toBe("My Emergency SOS");
    expect(matchesCodePhrase("please help my emergency sos now", "My Emergency SOS")).toBe(true);
  });

  it("6. Voice SOS does nothing while disabled", () => {
    useAppStore.setState({ voiceSosEnabled: false });

    // Simulate speech detection
    voiceSosService.mockSimulateVoiceInput("Blue Star");

    // No countdown should start
    expect(useAppStore.getState().voiceSosCountdown).toBeNull();
    expect(api.emergencies.create).not.toHaveBeenCalled();
  });

  it("7. Matching phrase starts confirmation countdown (5s)", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    await voiceSosService.setEnabled(true);

    voiceSosService.mockSimulateVoiceInput("help me Blue Star please");

    expect(useAppStore.getState().voiceSosCountdown).toBe(5);
    expect(api.emergencies.create).not.toHaveBeenCalled(); // false-trigger protection
  });

  it("8. Cancel prevents emergency creation and resets state", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    await voiceSosService.setEnabled(true);

    voiceSosService.mockSimulateVoiceInput("Blue Star");
    expect(useAppStore.getState().voiceSosCountdown).toBe(5);

    // Advance 2 seconds
    vi.advanceTimersByTime(2000);
    expect(useAppStore.getState().voiceSosCountdown).toBe(3);

    // User taps Cancel
    voiceSosService.cancelCountdown();

    expect(useAppStore.getState().voiceSosCountdown).toBeNull();

    // Advance remaining time
    vi.advanceTimersByTime(5000);

    // No emergency created
    expect(api.emergencies.create).not.toHaveBeenCalled();
    expect(useAppStore.getState().emergencyId).toBeNull();
  });

  it("9. Countdown completion triggers existing canonical SOS handler", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    await voiceSosService.setEnabled(true);

    const triggerCallback = vi.fn();
    voiceSosService.registerTriggerCallback(triggerCallback);

    voiceSosService.mockSimulateVoiceInput("Blue Star");

    // Let the 5 second countdown complete
    await vi.advanceTimersByTimeAsync(5000);

    expect(api.emergencies.create).toHaveBeenCalledTimes(1);
    expect(triggerCallback).toHaveBeenCalledWith("canonical-emg-voice-123");
  });

  it("10. Voice-triggered SOS produces canonical emergencyId and updates store", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    await voiceSosService.setEnabled(true);

    voiceSosService.mockSimulateVoiceInput("Blue Star");
    await vi.advanceTimersByTimeAsync(5000);

    expect(useAppStore.getState().emergencyId).toBe("canonical-emg-voice-123");
  });

  it("11. Voice-triggered SOS reuses existing canonical emergency payload schema", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    await voiceSosService.setEnabled(true);

    voiceSosService.mockSimulateVoiceInput("Blue Star");
    await vi.advanceTimersByTimeAsync(5000);

    expect(api.emergencies.create).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentType: "Voice SOS Emergency",
        description: expect.stringContaining("Blue Star"),
        location: { latitude: 28.6139, longitude: 77.209 },
      }),
    );
  });

  it("12. Microphone permission denied is handled safely without crash", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(false);

    const result = await voiceSosService.setEnabled(true);

    expect(result).toBe(false);
    expect(useAppStore.getState().voiceSosEnabled).toBe(false);
    expect(voiceSosService.isListening()).toBe(false);
  });

  it("13. Recognition session stops correctly", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    await voiceSosService.setEnabled(true);
    expect(voiceSosService.isListening()).toBe(true);

    voiceSosService.stopListening();
    expect(voiceSosService.isListening()).toBe(false);
    expect(useAppStore.getState().isVoiceListening).toBe(false);
  });

  it("14. No duplicate emergency from repeated recognition during the same confirmation", async () => {
    vi.spyOn(voiceSosService, "requestMicrophonePermission").mockResolvedValue(true);
    await voiceSosService.setEnabled(true);

    // Say phrase 3 times during countdown
    voiceSosService.mockSimulateVoiceInput("Blue Star");
    vi.advanceTimersByTime(1000);
    voiceSosService.mockSimulateVoiceInput("Blue Star again");
    vi.advanceTimersByTime(1000);
    voiceSosService.mockSimulateVoiceInput("Blue Star please");

    // Advance remainder of time
    await vi.advanceTimersByTimeAsync(3000);

    // Emergency MUST be created exactly once
    expect(api.emergencies.create).toHaveBeenCalledTimes(1);
  });

  it("15. Existing normal SOS behavior remains unchanged and produces canonical emergency", async () => {
    const id = await triggerCanonicalEmergencySOS({
      incidentType: "Accident",
      description: "Manual SOS button press",
    });

    expect(id).toBe("canonical-emg-voice-123");
    expect(api.emergencies.create).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentType: "Accident",
        description: "Manual SOS button press",
      }),
    );
    expect(useAppStore.getState().emergencyId).toBe("canonical-emg-voice-123");
  });
});
