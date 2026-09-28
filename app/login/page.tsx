"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

function phoneToFakeEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@chinadailybazar.app`;
}

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const fakeEmail = phoneToFakeEmail(phone);
      await signInWithEmailAndPassword(auth, fakeEmail, password);
      router.push("/account");
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid phone number or password");
      } else {
        setError(err.message || "Login failed");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/")}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-text-primary md:text-xl">Login</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-3 py-6 md:px-4 md:py-10">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bg-orange text-3xl">👤</div>
            <h2 className="mt-4 text-xl font-bold text-text-primary md:text-2xl">Welcome back</h2>
            <p className="mt-1 text-xs text-text-muted md:text-sm">Login with your phone and password</p>
          </div>

          <div className="space-y-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
            <Field
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              placeholder="+880 1XXX XXXXXX"
              type="tel"
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Your password"
              type="password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary md:text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-xs text-text-muted md:text-sm">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-gold-primary underline">
              Create one
            </Link>
          </p>
        </form>
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