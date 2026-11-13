"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ State for manual password reset request
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (user) {
    router.push("/account");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const digits = phone.replace(/\D/g, "");
      let normalized = digits;
      if (digits.startsWith("880") && digits.length === 13) {
        normalized = "0" + digits.slice(3);
      } else if (digits.startsWith("88") && digits.length === 13) {
        normalized = "0" + digits.slice(3);
      }
      const email = `${normalized}@chinadailybazar.app`;

      await signInWithEmailAndPassword(auth, email, password);
      router.push("/account");
    } catch (err: any) {
      setError("Invalid phone number or password.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle manual reset request
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await addDoc(collection(db, "password_requests"), {
        phone: resetPhone,
        createdAt: serverTimestamp(),
        status: "pending",
      });
      setResetSuccess(true);
      setTimeout(() => {
        setResetOpen(false);
        setResetSuccess(false);
        setResetPhone("");
      }, 3000);
    } catch (err) {
      alert("Failed to send request.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark md:p-8">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-text-primary">
            Welcome Back
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Login to your ChinaDailyBazar account
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-center text-sm text-red-primary">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-text-secondary md:text-xs">
                Password
              </label>
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="text-[11px] font-semibold text-gold-primary hover:underline md:text-xs"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          Don't have an account?{" "}
          <Link href="/signup" className="font-semibold text-gold-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>

      {/* ✅ Manual Reset Modal */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-bold text-text-primary">Reset Password</h3>
            {resetSuccess ? (
              <p className="text-sm text-success">
                ✅ Request sent! Please contact the admin on WhatsApp to get your new password.
              </p>
            ) : (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Enter your registered phone number below. The admin will see your request and provide you with a new password.
                </p>
                <input
                  type="text"
                  placeholder="01XXXXXXXXX"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm focus:border-gold-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetOpen(false)}
                    className="flex-1 rounded-lg border border-border-subtle py-2 text-sm font-semibold text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 rounded-lg bg-gold-primary py-2 text-sm font-semibold text-white"
                  >
                    {resetLoading ? "Sending..." : "Send Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}