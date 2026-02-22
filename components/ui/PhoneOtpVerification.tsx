/**
 * PhoneOtpVerification — Reusable Firebase Phone OTP verification component
 *
 * Props:
 *   phone          – current phone value (controlled)
 *   setPhone       – setter for phone
 *   phoneVerified  – boolean flag
 *   setPhoneVerified – setter for flag
 *   containerId    – unique DOM id for the invisible reCAPTCHA div
 *                    (must be unique per page instance)
 *   disabled       – optional; disables all inputs
 *   compact        – optional; renders a tighter layout
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle, RefreshCw, ShieldCheck, Loader2, X, ChevronDown } from 'lucide-react';
import {
  sendOtp,
  verifyOtp,
  initRecaptcha,
  getOtpErrorMessage,
} from '../../services/otpService';

// ─── Country codes ─────────────────────────────────────────────────────────

interface CountryOption {
  code: string;   // E.164 prefix, e.g. "+91"
  flag: string;   // emoji flag
  name: string;   // short ISO label
  digits: number; // expected local number length
}

const COUNTRIES: CountryOption[] = [
  { code: '+91',  flag: '🇮🇳', name: 'IN',  digits: 10 },
  { code: '+1',   flag: '🇺🇸', name: 'US',  digits: 10 },
  { code: '+44',  flag: '🇬🇧', name: 'UK',  digits: 10 },
  { code: '+61',  flag: '🇦🇺', name: 'AU',  digits: 9  },
  { code: '+971', flag: '🇦🇪', name: 'AE',  digits: 9  },
  { code: '+65',  flag: '🇸🇬', name: 'SG',  digits: 8  },
  { code: '+60',  flag: '🇲🇾', name: 'MY',  digits: 9  },
  { code: '+92',  flag: '🇵🇰', name: 'PK',  digits: 10 },
  { code: '+880', flag: '🇧🇩', name: 'BD',  digits: 10 },
  { code: '+94',  flag: '🇱🇰', name: 'LK',  digits: 9  },
  { code: '+977', flag: '🇳🇵', name: 'NP',  digits: 10 },
  { code: '+27',  flag: '🇿🇦', name: 'ZA',  digits: 9  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PhoneOtpVerificationProps {
  phone: string;
  setPhone: (v: string) => void;
  phoneVerified: boolean;
  setPhoneVerified: (v: boolean) => void;
  containerId?: string;
  disabled?: boolean;
  compact?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// ─── Component ───────────────────────────────────────────────────────────────

export const PhoneOtpVerification: React.FC<PhoneOtpVerificationProps> = ({
  phone,
  setPhone,
  phoneVerified,
  setPhoneVerified,
  containerId = 'recaptcha-container',
  disabled = false,
  compact = false,
}) => {
  // ── Split phone state (country code + local number)
  const [countryCode, setCountryCode] = useState('+91');
  const [localNumber, setLocalNumber] = useState('');

  // OTP digits – stored as array for individual inputs
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpSent, setOtpSent] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [resendTimer, setResendTimer] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived values
  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) ?? COUNTRIES[0];
  const e164 = `${countryCode}${localNumber}`;
  const isValidLength = localNumber.length === selectedCountry.digits;

  // Sync full E.164 to parent whenever code or local number changes
  useEffect(() => {
    setPhone(localNumber ? e164 : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, localNumber]);

  // ── reCAPTCHA: init once on mount — never cleared on unmount.
  // window.recaptchaVerifier persists across React re-renders and Vite HMR.
  // On any sendOtp failure the service auto-resets the verifier so retries
  // always get a fresh reCAPTCHA token (avoids auth/invalid-app-credential).
  useEffect(() => {
    initRecaptcha(containerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast helper ──────────────────────────────────────────────────────────

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // ── Resend countdown ─────────────────────────────────────────────────────

  const startResendTimer = useCallback(() => {
    setResendTimer(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // reCAPTCHA teardown is handled by the separate mount useEffect above.
    };
  }, [containerId]);

  // ── Country change
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(e.target.value);
    setLocalNumber('');
  };

  // ── Local number input (digits only, length-capped)
  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length <= selectedCountry.digits) setLocalNumber(digits);
  };

  // ── Send OTP ─────────────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    if (!localNumber) {
      showToast('Please enter a phone number.', 'error');
      return;
    }
    if (!isValidLength) {
      showToast(
        `Please enter a valid ${selectedCountry.digits}-digit number for (${countryCode}).`,
        'error'
      );
      return;
    }

    setSendingOtp(true);
    try {
      await sendOtp(e164, containerId);
      setOtpSent(true);
      setOtp(Array(OTP_LENGTH).fill(''));
      startResendTimer();
      showToast('OTP sent! Check your SMS.', 'success');
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err) {
      showToast(getOtpErrorMessage(err), 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      showToast('Please enter all 6 digits of the OTP.', 'error');
      return;
    }

    setVerifyingOtp(true);
    try {
      await verifyOtp(code);
      setPhoneVerified(true);
      showToast('Phone verified successfully! ✓', 'success');
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err) {
      showToast(getOtpErrorMessage(err), 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── OTP input handlers ────────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste – distribute digits
      const digits = value.slice(0, OTP_LENGTH - index).split('');
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otp.join('').length === OTP_LENGTH) {
      handleVerifyOtp();
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────

  const handleResend = () => {
    if (resendTimer > 0 || sendingOtp) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    handleSendOtp();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const labelClass = compact
    ? 'block text-xs font-black text-pink-400 mb-2 uppercase tracking-wider'
    : 'block text-sm font-bold text-pink-400 mb-2';

  const inputPy = compact ? 'py-2.5' : 'py-3';
  const inputPx = compact ? 'px-3' : 'px-4';
  const inputText = compact ? 'text-sm' : 'text-base';
  const inputBase = `${inputPx} ${inputPy} border-2 rounded-lg focus:outline-none ${inputText} transition-colors`;

  return (
    <div className="space-y-3">
      {/* reCAPTCHA anchor: visible checkbox on localhost, invisible in production */}
      <div id={containerId} className="mb-2" />

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toastMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium shadow-md transition-all ${
            toastMsg.type === 'success'
              ? 'bg-green-600/10 border border-green-500/30 text-green-400'
              : 'bg-red-600/10 border border-red-500/30 text-red-400'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle size={16} className="flex-shrink-0 text-green-400" />
          ) : (
            <X size={16} className="flex-shrink-0 text-red-400" />
          )}
          <span className="flex-1">{toastMsg.text}</span>
        </div>
      )}

      {/* ── Phone input + Send OTP ────────────────────────────── */}
      <div>
        <label className={labelClass}>
          Phone Number <span className="text-red-500">*</span>
        </label>

        {phoneVerified ? (
          /* Verified state – read-only with badge */
          <div className="flex items-center gap-3">
            <div className={`flex-1 ${inputBase} text-pink-100 flex items-center gap-2`} style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
              <span className="font-mono">{e164 || phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-green-400 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <CheckCircle size={16} />
              Verified ✓
            </div>
          </div>
        ) : (
          /* Editable: [ country dropdown ] [ local number ] [ Send OTP ] */
          <div className="flex gap-2">
            {/* Country code dropdown */}
            <div className="relative flex-shrink-0">
              <select
                value={countryCode}
                onChange={handleCountryChange}
                disabled={disabled || otpSent}
                className={`appearance-none ${inputBase} pr-7 text-pink-100 font-medium cursor-pointer ${
                  otpSent ? 'text-pink-300/40 cursor-not-allowed' : 'cursor-pointer'
                }`}
                style={{ minWidth: compact ? '5.5rem' : '6.5rem', background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-[#1a0a0a] text-pink-300">
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-400/50 pointer-events-none"
              />
            </div>

            {/* Local number input */}
            <input
              type="tel"
              inputMode="numeric"
              value={localNumber}
              onChange={handleLocalNumberChange}
              disabled={disabled || otpSent}
              placeholder={'9'.repeat(selectedCountry.digits)}
              maxLength={selectedCountry.digits}
              className="flex-1 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none font-mono tracking-wider"
              style={{
                background: 'rgba(255, 0, 102, 0.08)',
                border: otpSent
                  ? '1px solid rgba(255, 0, 102, 0.15)'
                  : localNumber && !isValidLength
                    ? '1px solid #fbbf24'
                    : '1px solid rgba(255, 0, 102, 0.3)',
                opacity: otpSent ? 0.6 : 1,
              }}
              required
            />

            {/* Send OTP button */}
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={disabled || sendingOtp || (otpSent && resendTimer > 0)}
              className="flex items-center gap-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all text-white"
              style={{
                padding: `${inputPy === 'py-2.5' ? '0.625rem' : '0.75rem'} ${inputPx === 'px-3' ? '0.75rem' : '1rem'}`,
                background: disabled || (otpSent && resendTimer > 0) 
                  ? 'rgba(255, 0, 102, 0.2)'
                  : 'linear-gradient(135deg, #ff0066, #ff4d94)',
                boxShadow: disabled || (otpSent && resendTimer > 0)
                  ? 'none'
                  : '0 0 15px rgba(255, 0, 102, 0.3)',
                opacity: disabled || (otpSent && resendTimer > 0) ? 0.5 : 1,
              }}
            >
              {sendingOtp ? (
                <><Loader2 size={14} className="animate-spin" />Sending…</>
              ) : otpSent ? (
                <><RefreshCw size={14} />Resend</>
              ) : (
                <><ShieldCheck size={14} />Send OTP</>
              )}
            </button>
          </div>
        )}

        {/* Digit-count hint */}
        {!phoneVerified && !otpSent && localNumber && !isValidLength && (
          <p className="mt-1 text-xs text-amber-400 font-medium">
            {selectedCountry.digits} digits required — {localNumber.length} entered
          </p>
        )}
      </div>

      {/* ── OTP input section (shown after OTP sent, hidden after verified) ── */}
      {otpSent && !phoneVerified && (
        <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
          <p className="text-xs text-pink-300 font-semibold">
            Enter the 6-digit OTP sent to{' '}
            <span className="font-black font-mono text-pink-200">{e164}</span>
          </p>

          {/* 6-digit OTP inputs */}
          <div className="flex gap-2 justify-start">
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={OTP_LENGTH} // allows paste
                value={otp[i]}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                disabled={verifyingOtp || disabled}
                className="w-10 h-12 text-center text-lg font-black rounded-lg focus:outline-none transition-colors text-pink-100"
                style={{
                  background: 'rgba(255, 0, 102, 0.08)',
                  border: otp[i] ? '1px solid rgba(255, 0, 102, 0.6)' : '1px solid rgba(255, 0, 102, 0.2)',
                  boxShadow: otp[i] ? '0 0 10px rgba(255, 0, 102, 0.2)' : 'none',
                  opacity: true ? 1 : 0.5,
                }}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Verify button + Resend timer */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={verifyingOtp || disabled || otp.join('').length < OTP_LENGTH}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold transition-all text-white"
              style={{
                background: verifyingOtp || otp.join('').length < OTP_LENGTH
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: verifyingOtp || otp.join('').length < OTP_LENGTH
                  ? 'none'
                  : '0 0 15px rgba(34, 197, 94, 0.3)',
                opacity: verifyingOtp || otp.join('').length < OTP_LENGTH ? 0.5 : 1,
              }}
            >
              {verifyingOtp ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Verify OTP
                </>
              )}
            </button>

            <span className="text-xs text-pink-300/70">
              {resendTimer > 0 ? (
                <>Resend in <span className="font-bold text-pink-400">{resendTimer}s</span></>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={sendingOtp}
                  className="text-pink-400 hover:text-pink-300 font-semibold underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneOtpVerification;
