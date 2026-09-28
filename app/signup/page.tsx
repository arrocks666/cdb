"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

function phoneToFakeEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@chinadailybazar.app`;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [userCode, setUserCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid phone number (10+ digits)");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const newCode = generateCode();
    setCode(newCode);
    setUserCode("");
    setStep(2);
  };

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (userCode !== code) {
      setError("Incorrect code. Please check and try again.");
      return;
    }

    setLoading(true);

    let createdUid: string | null = null;

    try {
      // Step 1: Create Firebase Auth account
      const fakeEmail = phoneToFakeEmail(phone);
      console.log("[SIGNUP] Creating auth account for:", fakeEmail);
      const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
      createdUid = cred.user.uid;
      console.log("[SIGNUP] Auth account created, uid:", createdUid);

      // Step 2: Update display name
      await updateProfile(cred.user, { displayName: phone });
      console.log("[SIGNUP] Display name set");

      // Step 3: Write to Firestore
      console.log("[SIGNUP] Writing user doc to Firestore...");
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        phone,
        email: email.trim() || "",
        role: "customer",
        createdAt: serverTimestamp(),
      });
      console.log("[SIGNUP] Firestore user doc written successfully");

      router.push("/account");
    } catch (err: any) {
      console.error("[SIGNUP] ERROR:", err);
      console.error("[SIGNUP] Error code:", err.code);
      console.error("[SIGNUP] Error message:", err.message);

      if (err.code === "auth/email-already-in-use") {
        setError(
          "This phone number is already registered. Please login instead."
        );
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (err.code === "permission-denied") {
        setError(
          "Auth succeeded but Firestore write failed. Rules may not have propagated yet. Wait 1 minute and try again."
        );
      } else if (err.message) {
        setError(`${err.code || "Error"}: ${err.message}`);
      } else {
        setError("Failed to create account. Check console for details.");
      }

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button onClick={() => router.push("/")} aria-label="Back" className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-lg font-bold text-text-primary md:text-xl">Create Account</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-3 py-6 md:px-4 md:py-10">
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bg-orange text-3xl">📱</div>
              <h2 className="mt-4 text-xl font-bold text-text-primary md:text-2xl">Create your account</h2>
              <p className="mt-1 text-xs text-text-muted md:text-sm">Use your phone number to sign up</p>
            </div>

            <div className="space-y-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
              <Field label="Phone Number *" value={phone} onChange={setPhone} placeholder="+880 1XXX XXXXXX" type="tel" />
              <Field label="Password *" value={password} onChange={setPassword} placeholder="At least 6 characters" type="password" />
              <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
            </div>

            {error && (
              <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary md:text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury">
              Continue
            </button>

            <p className="text-center text-xs text-text-muted md:text-sm">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-gold-primary underline">
                Login
              </Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyAndCreate} className="space-y-4">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bg-orange text-3xl">✅</div>
              <h2 className="mt-4 text-xl font-bold text-text-primary md:text-2xl">Verify your number</h2>
              <p className="mt-1 text-xs text-text-muted md:text-sm">Type the code shown below to confirm</p>
            </div>

            <div className="rounded-lg border-2 border-dashed border-gold-primary bg-bg-orange p-6 text-center shadow-card-dark">
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Your verification code</p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-[0.3em] text-gold-primary">
                {code}
              </p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Enter the code above *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder=""
                autoComplete="off"
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary md:text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || userCode.length !== 6}
              className="w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Creating account..." : "Verify & Create Account"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setUserCode("");
                setCode("");
                setError(null);
              }}
              className="w-full py-2 text-xs font-medium text-text-muted transition hover:text-text-primary md:text-sm"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
      />
    </div>
  );
}