/**
 * Firebase Phone OTP Service
 * Handles reCAPTCHA setup, OTP sending and verification
 * Uses Firebase Auth modular v9+ syntax
 *
 * reCAPTCHA strategy
 * ─────────────────
 * A single RecaptchaVerifier is stored on window.recaptchaVerifier.
 *
 * LOCALHOST (development):
 *   uses size: "normal" → shows a visible checkbox captcha
 *   The user must solve it manually before OTP sends.
 *   This avoids invalid-app-credential and rate-limit issues.
 *
 * PRODUCTION:
 *   uses size: "invisible" → normal invisible reCAPTCHA flow.
 *
 * The verifier is created ONCE on component mount and NEVER cleared
 * during normal React lifecycle. This prevents "already rendered" errors.
 */

import { auth } from './firebaseConfig';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';

// ─── Global type declaration ──────────────────────────────────────────────────
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null | undefined;
    recaptchaWidgetId: number | null | undefined;
  }
}

let _confirmationResult: ConfirmationResult | null = null;

// ─── Environment detection ───────────────────────────────────────────────────

export const isLocalhost = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
  );
};

// ─── Phone number formatting (display helper) ────────────────────────────────

/**
 * Formats a raw phone value for display.
 * The component now assembles the E.164 string itself, so this is only
 * used for the verified-badge label.
 */
export const formatPhoneNumber = (phone: string): string => {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
};

// ─── reCAPTCHA lifecycle ─────────────────────────────────────────────────────

/**
 * Creates window.recaptchaVerifier if it does not already exist.
 * - On localhost: uses size="normal" (visible checkbox)
 * - In production: uses size="invisible"
 *
 * Call this from useEffect with an empty dependency array:
 *   useEffect(() => { initRecaptcha(containerId); }, []);
 *
 * DO NOT clear the verifier on component unmount — it survives across
 * React re-renders and Vite HMR. Clearing causes "already rendered" errors.
 */

// Prevent race conditions during React StrictMode double-invoke
let _recaptchaInitInProgress = false;

export const initRecaptcha = (containerId: string): void => {
  // Already exists → reuse (survives HMR and re-renders)
  if (window.recaptchaVerifier) {
    console.log('[OTP] reCAPTCHA already initialized, reusing.');
    return;
  }

  // Prevent double-init from React StrictMode
  if (_recaptchaInitInProgress) {
    console.log('[OTP] reCAPTCHA init already in progress, skipping.');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[OTP] reCAPTCHA container #${containerId} not in DOM yet.`);
    return;
  }

  // Clear any stale reCAPTCHA widget from container (React StrictMode cleanup)
  container.innerHTML = '';

  // Use VISIBLE captcha on localhost so the user can manually solve it.
  // This prevents invalid-app-credential and rate-limit issues in dev.
  const size = isLocalhost() ? 'normal' : 'invisible';

  _recaptchaInitInProgress = true;
  console.log(`[OTP] Creating reCAPTCHA with size="${size}"`);

  try {
    // Note: Firebase manages reCAPTCHA keys internally - do NOT pass a custom sitekey.
    // The reCAPTCHA v2 key registered in Google reCAPTCHA console must also be
    // registered in Firebase Console → App Check → reCAPTCHA v2 for this to work.
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size,
      callback: () => {
        console.log('[OTP] reCAPTCHA solved!');
      },
      'expired-callback': () => {
        console.log('[OTP] reCAPTCHA token expired. User must solve again.');
      },
    });

    // Render immediately.
    window.recaptchaVerifier
      .render()
      .then((widgetId) => {
        window.recaptchaWidgetId = widgetId;
        console.log('[OTP] reCAPTCHA rendered, widgetId:', widgetId);
      })
      .catch((err) => {
        console.error('[OTP] reCAPTCHA render failed:', err);
        window.recaptchaVerifier = null;
      })
      .finally(() => {
        _recaptchaInitInProgress = false;
      });
  } catch (err) {
    console.error('[OTP] reCAPTCHA creation failed:', err);
    window.recaptchaVerifier = null;
    _recaptchaInitInProgress = false;
  }
};

/**
 * Checks if reCAPTCHA is ready for use.
 */
export const isRecaptchaReady = (): boolean => {
  return !!window.recaptchaVerifier;
};

/**
 * Clears and nulls window.recaptchaVerifier.
 * ONLY call this if you need to force a full reset (e.g., page navigation).
 * Do NOT call on normal component unmount.
 */
export const clearRecaptcha = (): void => {
  _recaptchaInitInProgress = false;
  
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (err) {
      console.warn('[OTP] Error clearing reCAPTCHA:', err);
    }
  }
  window.recaptchaVerifier = null;
  window.recaptchaWidgetId = null;

  // Wipe container innerHTML
  const container = document.getElementById('recaptcha-container');
  if (container) container.innerHTML = '';
};

/**
 * Force resets the reCAPTCHA verifier. Use only after a hard failure.
 */
export const resetRecaptcha = async (containerId: string): Promise<void> => {
  clearRecaptcha();
  await new Promise<void>((r) => setTimeout(r, 100)); // Wait for DOM to settle
  initRecaptcha(containerId);
};

// ─── Send OTP ────────────────────────────────────────────────────────────────

/**
 * Sends an OTP to the given E.164 phone number.
 * The verifier must already exist (call initRecaptcha first).
 */
export const sendOtp = async (e164Phone: string, containerId: string): Promise<ConfirmationResult> => {
  const verifier = window.recaptchaVerifier;
  if (!verifier) {
    throw new Error('reCAPTCHA not ready. Please wait for the captcha to load and try again.');
  }

  console.log(`[OTP] Sending OTP to ${e164Phone}`);

  try {
    _confirmationResult = await signInWithPhoneNumber(auth, e164Phone, verifier);
    console.log('[OTP] OTP sent successfully!');
    return _confirmationResult;
  } catch (err: any) {
    console.error('[OTP] sendOtp failed:', err?.code, err?.message);
    // Do NOT automatically reset the verifier — let the user retry with
    // the existing widget. Only reset on specific unrecoverable errors.
    if (err?.code === 'auth/invalid-app-credential' || err?.code === 'auth/captcha-check-failed') {
      console.log('[OTP] Resetting reCAPTCHA due to credential error...');
      await resetRecaptcha(containerId);
    }
    throw err;
  }
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────

export const verifyOtp = async (code: string): Promise<boolean> => {
  if (!_confirmationResult) {
    throw new Error('No OTP session found. Please send OTP again.');
  }
  await _confirmationResult.confirm(code);
  return true;
};

// ─── Cleanup ─────────────────────────────────────────────────────────────────

export const clearOtpSession = (): void => {
  clearRecaptcha();
  _confirmationResult = null;
};

// ─── Error message helper ────────────────────────────────────────────────────

/**
 * Returns a user-friendly error message.
 * In development (localhost), also includes the raw error code for debugging.
 */
export const getOtpErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return 'Something went wrong. Please try again.';

  const code = (error as any).code as string | undefined;
  const message = (error as any).message as string | undefined;

  let userMessage: string;
  switch (code) {
    case 'auth/invalid-app-credential':
      userMessage = 'reCAPTCHA verification failed. Please solve the captcha checkbox and try again.';
      break;
    case 'auth/invalid-phone-number':
      userMessage = 'Invalid phone number. Please check the country code and number.';
      break;
    case 'auth/too-many-requests':
      userMessage = 'Too many attempts. Please wait 5 minutes before trying again.';
      break;
    case 'auth/invalid-verification-code':
      userMessage = 'Wrong OTP. Please check and try again.';
      break;
    case 'auth/code-expired':
      userMessage = 'OTP has expired. Please request a new one.';
      break;
    case 'auth/missing-verification-code':
      userMessage = 'Please enter the 6-digit OTP.';
      break;
    case 'auth/captcha-check-failed':
      userMessage = 'reCAPTCHA check failed. Please solve the captcha checkbox and try again.';
      break;
    case 'auth/quota-exceeded':
      userMessage = 'SMS quota exceeded. Please try again later.';
      break;
    case 'auth/network-request-failed':
      userMessage = 'Network error. Please check your internet connection.';
      break;
    default:
      userMessage = message || 'Something went wrong. Please try again.';
  }

  // In development, append the error code for debugging
  if (isLocalhost() && code) {
    userMessage += ` [${code}]`;
  }

  return userMessage;
};
