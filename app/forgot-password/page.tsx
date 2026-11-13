 
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-reset-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setMessage("Reset link sent! Check your email.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
      <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark">
        <h1 className="mb-2 text-xl font-bold text-text-primary">Reset Password</h1>
        <p className="mb-6 text-sm text-text-muted">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {error && <p className="mb-4 text-sm text-red-primary">{error}</p>}
        {message && <p className="mb-4 text-sm text-success">{message}</p>}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <Link href="/login" className="mt-4 block text-center text-xs text-gold-primary underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}