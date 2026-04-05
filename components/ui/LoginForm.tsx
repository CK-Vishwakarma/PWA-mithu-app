"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { sendOTP, verifyOTP } from "@/lib/auth";
import Button from "./Button";
import Input from "./Input";

type Step = "phone" | "otp";

export default function LoginForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  async function handleSendOTP() {
    setError("");
    if (!phone.trim()) return setError("Enter a valid phone number.");

    setLoading(true);
    try {
      const result = await sendOTP(phone.trim(), verifierRef);
      setConfirmation(result);
      setStep("otp");
    } catch (err: unknown) {
      // Reset verifier on failure so next attempt gets a fresh one
      verifierRef.current?.clear();
      verifierRef.current = null;
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    setError("");
    if (!otp.trim() || otp.length < 6) return setError("Enter the 6-digit OTP.");
    if (!confirmation) return;

    setLoading(true);
    try {
      await verifyOTP(confirmation, otp.trim());
      router.push("/chat");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Always in DOM — RecaptchaVerifier needs this div to exist */}
      <div id="recaptcha-container" />

      {step === "phone" ? (
        <>
          <Input
            id="phone"
            label="Phone number"
            type="tel"
            placeholder="+1 234 567 8900"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button type="button" fullWidth disabled={loading} onClick={handleSendOTP}>
            {loading ? "Sending…" : "Send OTP"}
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="text-indigo-600 hover:underline text-xs"
            >
              ← Change number
            </button>
            <span className="text-xs text-gray-500">{phone}</span>
          </div>

          <Input
            id="otp"
            label="One-time password"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button type="button" fullWidth disabled={loading} onClick={handleVerifyOTP}>
            {loading ? "Verifying…" : "Verify OTP"}
          </Button>
        </>
      )}
    </div>
  );
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    const messages: Record<string, string> = {
      "auth/invalid-phone-number": "Invalid phone number. Include country code (e.g. +1...).",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/invalid-verification-code": "Incorrect OTP. Please try again.",
      "auth/code-expired": "OTP expired. Please request a new one.",
      "auth/missing-phone-number": "Phone number is required.",
    };
    return messages[code] ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
