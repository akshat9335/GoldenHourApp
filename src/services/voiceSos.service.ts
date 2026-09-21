import { useAppStore } from '@/store/useAppStore';
import { triggerCanonicalEmergencySOS } from './emergency';

export type VoiceSosTriggerCallback = (emergencyId: string) => void;

/**
 * Normalizes speech transcript and target phrase for reliable matching.
 * Strips punctuation, handles multi-word whitespace, and converts to lowercase.
 */
export function normalizeVoiceText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether speech transcript matches the target code phrase.
 * Matches if the normalized phrase appears as a distinct word sequence in the transcript.
 */
export function matchesCodePhrase(transcript: string, codePhrase: string): boolean {
  const normTranscript = normalizeVoiceText(transcript);
  const normPhrase = normalizeVoiceText(codePhrase);

  if (!normPhrase) return false;

  // Exact match or contains as word boundary phrase
  if (normTranscript === normPhrase) return true;
  const regex = new RegExp(`(^|\\s)${normPhrase}(\\s|$)`, 'i');
  return regex.test(normTranscript);
}

class VoiceSosService {
  private activeRecognizer: any = null;
  private isListeningState: boolean = false;
  private permissionGranted: boolean = false;
  private countdownTimer: any = null;
  private onTriggerCallback: VoiceSosTriggerCallback | null = null;
  private isProcessingEmergency: boolean = false;

  constructor() {
    // Check initial permission status if running on Web
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'microphone' as PermissionName })
          .then((res) => {
            this.permissionGranted = res.state === 'granted';
          })
          .catch(() => {});
      }
    }
  }

  /**
   * Registers a listener callback invoked when Voice SOS successfully triggers an emergency.
   */
  public registerTriggerCallback(cb: VoiceSosTriggerCallback | null): void {
    this.onTriggerCallback = cb;
  }

  /**
   * Checks whether microphone permission is granted.
   */
  public hasPermission(): boolean {
    return this.permissionGranted;
  }

  /**
   * Requests microphone permission.
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release stream tracks to avoid keeping the mic on unnecessarily
        stream.getTracks().forEach((track) => track.stop());
        this.permissionGranted = true;
        return true;
      } catch (_err) {
        this.permissionGranted = false;
        return false;
      }
    }

    // Default optimistic granted for non-web environments where native modal handles it
    this.permissionGranted = true;
    return true;
  }

  /**
   * Enables or disables Voice SOS.
   * When disabled, stops listening and cancels any active countdown.
   */
  public async setEnabled(enabled: boolean): Promise<boolean> {
    const store = useAppStore.getState();

    if (!enabled) {
      this.stopListening();
      this.cancelCountdown();
      store.setVoiceSosEnabled(false);
      store.setIsVoiceListening(false);
      return true;
    }

    // If enabling, ensure microphone permission is requested first
    const granted = await this.requestMicrophonePermission();
    if (!granted) {
      store.setVoiceSosEnabled(false);
      store.setIsVoiceListening(false);
      return false;
    }

    store.setVoiceSosEnabled(true);
    await this.startListening();
    return true;
  }

  /**
   * Updates user's custom Voice SOS code phrase.
   */
  public setCodePhrase(phrase: string): void {
    const trimmed = phrase.trim();
    if (trimmed) {
      useAppStore.getState().setVoiceSosPhrase(trimmed);
    }
  }

  /**
   * Returns current code phrase.
   */
  public getCodePhrase(): string {
    return useAppStore.getState().voiceSosPhrase || 'Blue Star';
  }

  /**
   * Starts listening for the custom code phrase if Voice SOS is enabled.
   */
  public async startListening(): Promise<boolean> {
    const store = useAppStore.getState();

    // Voice SOS must NOT listen if disabled
    if (!store.voiceSosEnabled) {
      this.isListeningState = false;
      store.setIsVoiceListening(false);
      return false;
    }

    if (this.isListeningState) {
      return true;
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          this.activeRecognizer = new SpeechRecognition();
          this.activeRecognizer.continuous = true;
          this.activeRecognizer.interimResults = true;
          this.activeRecognizer.lang = 'en-US';

          this.activeRecognizer.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcript = event.results[i][0].transcript;
              this.handleSpeechTranscript(transcript);
            }
          };

          this.activeRecognizer.onerror = (err: any) => {
            // Audio capture / network / permission error
            if (err.error === 'not-allowed' || err.error === 'permission-denied') {
              this.permissionGranted = false;
              this.stopListening();
            }
          };

          this.activeRecognizer.onend = () => {
            // Automatically restart if still enabled and listening
            const currentStore = useAppStore.getState();
            if (currentStore.voiceSosEnabled && this.isListeningState) {
              try {
                this.activeRecognizer.start();
              } catch (_e) {}
            }
          };

          this.activeRecognizer.start();
          this.isListeningState = true;
          store.setIsVoiceListening(true);
          return true;
        } catch (_err) {
          // Native or unsupported runtime
        }
      }
    }

    // In native runtime without browser SpeechRecognition
    this.isListeningState = true;
    store.setIsVoiceListening(true);
    return true;
  }

  /**
   * Stops voice monitoring and releases speech recognition session.
   */
  public stopListening(): void {
    if (this.activeRecognizer) {
      try {
        this.activeRecognizer.abort();
      } catch (_e) {}
      this.activeRecognizer = null;
    }
    this.isListeningState = false;
    useAppStore.getState().setIsVoiceListening(false);
  }

  /**
   * Checks whether the service is currently actively listening.
   */
  public isListening(): boolean {
    return this.isListeningState;
  }

  /**
   * Handles incoming speech transcripts.
   */
  public handleSpeechTranscript(transcript: string): void {
    const store = useAppStore.getState();

    // Must be enabled
    if (!store.voiceSosEnabled) return;

    // Must not duplicate if countdown is already running or emergency is processing
    if (this.countdownTimer !== null || this.isProcessingEmergency) {
      return;
    }

    const codePhrase = store.voiceSosPhrase || 'Blue Star';

    if (matchesCodePhrase(transcript, codePhrase)) {
      this.startFalseTriggerCountdown();
    }
  }

  /**
   * Starts the 5-second false-trigger protection countdown.
   */
  public startFalseTriggerCountdown(): void {
    if (this.countdownTimer !== null || this.isProcessingEmergency) {
      return; // Deduplication protection
    }

    const store = useAppStore.getState();
    let secondsLeft = 5;
    store.setVoiceSosCountdown(secondsLeft);

    this.countdownTimer = setInterval(() => {
      secondsLeft -= 1;

      if (secondsLeft > 0) {
        store.setVoiceSosCountdown(secondsLeft);
      } else {
        // Countdown completed! Trigger canonical SOS flow
        this.cancelCountdownTimerOnly();
        store.setVoiceSosCountdown(null);
        this.executeVoiceEmergencyDispatch();
      }
    }, 1000);
  }

  /**
   * Cancels the active countdown.
   * Does NOT create emergency or send any alerts.
   */
  public cancelCountdown(): void {
    this.cancelCountdownTimerOnly();
    useAppStore.getState().setVoiceSosCountdown(null);
    this.isProcessingEmergency = false;
  }

  private cancelCountdownTimerOnly(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Dispatches the canonical emergency when the countdown completes.
   */
  public async executeVoiceEmergencyDispatch(): Promise<string | null> {
    if (this.isProcessingEmergency) return null;
    this.isProcessingEmergency = true;

    try {
      const codePhrase = this.getCodePhrase();
      const emergencyId = await triggerCanonicalEmergencySOS({
        incidentType: 'Voice SOS Emergency',
        description: `Triggered via Voice SOS phrase: "${codePhrase}"`,
      });

      if (this.onTriggerCallback) {
        this.onTriggerCallback(emergencyId);
      }

      return emergencyId;
    } catch (err) {
      console.warn('[VoiceSOS] Failed to dispatch canonical emergency:', err);
      return null;
    } finally {
      this.isProcessingEmergency = false;
    }
  }

  /**
   * Test/Simulation hook: Simulates speech input without requiring real microphone hardware.
   */
  public mockSimulateVoiceInput(phrase: string): void {
    this.handleSpeechTranscript(phrase);
  }
}

export const voiceSosService = new VoiceSosService();
