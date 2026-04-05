import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { MutableRefObject } from "react";
import { auth } from "./firebase";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function sendOTP(
  phone: string,
  verifierRef: MutableRefObject<RecaptchaVerifier | null>
): Promise<ConfirmationResult> {
  // Create verifier lazily — only when actually needed
  if (!verifierRef.current) {
    verifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
  }

  return signInWithPhoneNumber(auth, phone, verifierRef.current);
}

export async function verifyOTP(
  confirmation: ConfirmationResult,
  otp: string
) {
  return confirmation.confirm(otp);
}
