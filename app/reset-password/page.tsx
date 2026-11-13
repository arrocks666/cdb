 
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode"); // The secure code from the email
  
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!oobCode) return setError("Invalid or missing reset link.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    try {
      // ✅ Firebase securely saves the new password
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Link may be expired.");
    }
  };

  if (!oobCode) {
    return (
      <div className="text-center p-10">
        <h1 className="text-xl font-bold text-red-primary">Invalid Reset Link</h1>
        <Link href="/forgot-password" className="text-gold-primary underline mt-4 block">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark">
      <h1 className="text-xl font-bold text-text-primary mb-4">Set New Password</h1>
      
      {error && <p className="text-red-primary text-sm mb-4">{error}</p>}
      
      {success ? (
        <div className="text-success text-sm">
          ✅ Password reset successful! Redirecting to login...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm focus:border-gold-primary focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm focus:border-gold-primary focus:outline-none"
            required
          />
          <button type="submit" className="w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white">
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}