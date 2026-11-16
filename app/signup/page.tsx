"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: Added Name, Email, and Address to the state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    district: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ✅ MANDATORY VALIDATION
    if (!formData.name.trim()) return setError("Full Name is required");
    if (!formData.phone.trim()) return setError("Phone Number is required");
    if (!formData.email.trim()) return setError("Email Address is required");
    if (!formData.address.trim()) return setError("Address is required");
    
    if (formData.password.length < 6) return setError("Password must be at least 6 characters");
    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match");

    setLoading(true);

    try {
      // 1. Normalize phone for the Firebase Auth email
      const digits = formData.phone.replace(/\D/g, "");
      let normalized = digits;
      if (digits.startsWith("880") && digits.length === 13) {
        normalized = "0" + digits.slice(3);
      } else if (digits.startsWith("88") && digits.length === 13) {
        normalized = "0" + digits.slice(3);
      }
      const generatedEmail = `${normalized}@chinadailybazar.app`;

      // 2. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        generatedEmail,
        formData.password
      );
      const user = userCredential.user;

      // 3. Save all details to Firestore 'users' collection
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name.trim(),
        phone: normalized,
        email: formData.email.trim(),
        savedAddress: {
          name: formData.name.trim(),
          phone: normalized,
          email: formData.email.trim(),
          address: formData.address.trim(),
          district: formData.district.trim(),
        },
        createdAt: Date.now(),
        createdAtServer: serverTimestamp(),
      });

      router.push("/account");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This phone number is already registered.");
      } else {
        setError(err.message || "Failed to create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark md:p-8">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-text-primary">
            Create an Account
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Join ChinaDailyBazar today
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-center text-sm text-red-primary">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="01XXXXXXXXX"
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Full Address *
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="House, Road, Area"
              rows={2}
              required
              className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              District
            </label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="e.g. Dhaka"
              className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 characters"
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-gold-primary hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}