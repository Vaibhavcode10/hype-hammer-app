/**
 * Third-Party OTP Service
 * Replaces Firebase Phone OTP with external API
 * 
 * API Base: https://us-central1-flutter-chedo.cloudfunctions.net/chedo/chatbot/auth/
 * 
 * Endpoints:
 *   POST /send-otp → { phoneNumber } → { sessionId }
 *   POST /verify-otp → { sessionId, otp } → { chatbotToken, phoneNumber }
 */

const API_BASE = 'https://us-central1-flutter-chedo.cloudfunctions.net/chedo/chatbot/auth';

export interface SendOtpRequest {
  phoneNumber: string;
}

export interface SendOtpResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

export interface VerifyOtpRequest {
  sessionId: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  chatbotToken: string;
  phoneNumber: string;
  message: string;
}

/**
 * Send OTP to phone number
 * Returns sessionId for verification
 */
export const sendOtp = async (phoneNumber: string): Promise<SendOtpResponse> => {
  try {
    console.log(`[OTP] Sending OTP to ${phoneNumber}`);
    
    const response = await fetch(`${API_BASE}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OTP] Send failed:', data);
      throw new Error(data.message || 'Failed to send OTP');
    }

    console.log('[OTP] OTP sent successfully. SessionId:', data.sessionId);
    return data;
  } catch (error) {
    console.error('[OTP] Send OTP error:', error);
    throw error;
  }
};

/**
 * Verify OTP code
 * Returns chatbotToken for authentication
 */
export const verifyOtp = async (sessionId: string, otp: string): Promise<VerifyOtpResponse> => {
  try {
    console.log(`[OTP] Verifying OTP for session ${sessionId}`);
    
    const response = await fetch(`${API_BASE}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OTP] Verification failed:', data);
      throw new Error(data.message || 'Failed to verify OTP');
    }

    console.log('[OTP] OTP verified successfully. Token:', data.chatbotToken);
    return data;
  } catch (error) {
    console.error('[OTP] Verify OTP error:', error);
    throw error;
  }
};

/**
 * Get error message for display
 */
export const getOtpErrorMessage = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An error occurred. Please try again.';
};

/**
 * Store chatbot token in sessionStorage
 */
export const storeChatbotToken = (token: string): void => {
  sessionStorage.setItem('chatbotToken', token);
};

/**
 * Retrieve chatbot token from sessionStorage
 */
export const getChatbotToken = (): string | null => {
  return sessionStorage.getItem('chatbotToken');
};

/**
 * Clear chatbot token
 */
export const clearChatbotToken = (): void => {
  sessionStorage.removeItem('chatbotToken');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getChatbotToken();
};
