import { api } from './api';

export interface VoiceCallConfig {
  agentId: string;
  phoneNumber?: string;
  metadata?: Record<string, any>;
}

export interface VoiceCallResponse {
  callId: string;
  status: string;
  phoneNumber?: string;
  message: string;
}

class VoiceService {
  private isSupported: boolean;
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;

  constructor() {
    // Check if browser supports speech recognition and synthesis
    this.isSupported =
      'webkitSpeechRecognition' in window ||
      'SpeechRecognition' in window ||
      'speechSynthesis' in window;

    if (this.isSupported) {
      // Initialize speech recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }

      // Initialize speech synthesis
      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
      }
    }
  }

  /**
   * Check if voice features are supported in the current browser
   */
  isVoiceSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Start voice recording and return transcribed text
   */
  async startVoiceRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        // Recognition ended
      };

      try {
        this.recognition.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop voice recording
   */
  stopVoiceRecording(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Speak text using browser's speech synthesis
   */
  async speakText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      utterance.onend = () => resolve();
      utterance.onerror = (event) =>
        reject(new Error(`Speech synthesis error: ${event.error}`));

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop current speech synthesis
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Initiate a voice call through Retell AI
   */
  async initiateVoiceCall(config: VoiceCallConfig): Promise<VoiceCallResponse> {
    try {
      const response = await api.post('/voice/call', config);
      return response.data;
    } catch (error) {
      console.error('Failed to initiate voice call:', error);
      throw new Error('Failed to start voice call. Please try again.');
    }
  }

  /**
   * Get available voice call status
   */
  async getCallStatus(callId: string): Promise<any> {
    try {
      const response = await api.get(`/voice/call/${callId}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get call status:', error);
      throw error;
    }
  }
}

export const voiceService = new VoiceService();
