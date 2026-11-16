"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Verification State
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  
  // Password Reset State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");

  // ✅ Helper to make phone matching bulletproof
  const cleanPhone = (p: string) => {
    let d = p.replace(/\D/g, ""); // Remove non-digits
    if (d.startsWith("880") && d.length === 13) d = "0" + d.slice(3);
    if (d.startsWith("88") && d.length === 13) d = "0" + d.slice(3);
    return d;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const inputPhone = cleanPhone(phone);

      // ✅ RULE 1: Verify by Order ID
      if (orderId.trim() !== "") {
        const q = query(collection(db, "orders"), where("id", "==", orderId.trim()));
        const snap = await getDocs(q);
        
        if (snap.empty) throw new Error("No order found with this Order ID.");
        
        const orderData = snap.docs[0].data();
        const orderPhone = cleanPhone(orderData.address?.phone || orderData.userPhone || "");
        
        if (orderPhone !== inputPhone) {
          throw new Error("The phone number does not match this Order ID.");
        }
      } 
      // ✅ RULE 2: Verify by Full Address
      else if (fullAddress.trim().length > 5) { // Ensure they typed a real address
        // Try to find the user by phone first
        const q = query(collection(db, "users"), where("phone", "==", inputPhone));
        let snap = await getDocs(q);
        
        // If not found, try savedAddress.phone
        if (snap.empty) {
          const q2 = query(collection(db, "users"), where("savedAddress.phone", "==", inputPhone));
          snap = await getDocs(q2);
        }

        if (snap.empty) throw new Error("No user found with this phone number.");
        
        const userData = snap.docs[0].data();
        const savedAddress = (userData.savedAddress?.address || "").trim();
        
        if (savedAddress === "") {
            throw new Error("This account does not have a saved address. Please use an Order ID.");
        }

        // Loose match: check if one contains the other, ignoring case and spaces
        const cleanInput = fullAddress.replace(/\s+/g, "").toLowerCase();
        const cleanSaved = savedAddress.replace(/\s+/g, "").toLowerCase();
        
        // ✅ STRICT CHECK: Must match exactly (ignoring spaces/case)
        if (cleanSaved !== cleanInput) {
          throw new Error("The address does not match our records exactly.");
        }
      } else {
        throw new Error("Please enter either a valid Order ID or a valid Full Address.");
      }

      setRegisteredEmail(`${inputPhone}@chinadailybazar.app`);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      // ✅ This uses the Admin API route to update the password
      const res = await fetch("/api/admin/set-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email: registeredEmail, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");

      alert("Password reset successfully! Please login.");
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark md:p-8">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-text-primary">Reset Password</h1>
          <p className="mt-1 text-sm text-text-muted">
            {step === 1 ? "Verify your identity." : "Create a new password."}
          </p>
        </div>

        {error && <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-center text-sm text-red-primary">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">Registered Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required className="w-full rounded-lg border p-2.5" />
            </div>

            <div className="rounded-lg border border-gold-primary/30 bg-bg-orange/10 p-3 text-xs text-text-secondary">
              <p className="font-semibold text-text-primary mb-1">Choose ONE verification method:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>If you have ordered before: enter your <strong>Order ID</strong>.</li>
                <li>If you have never ordered: enter your <strong>Full Address</strong>.</li>
              </ul>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">Last Order ID (Optional)</label>
              <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. 548291" className="w-full rounded-lg border p-2.5" />
            </div>

            <div className="text-center text-xs text-text-muted font-bold">— OR —</div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">Full Address (Optional)</label>
              <input type="text" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="House, Road, Area" className="w-full rounded-lg border p-2.5" />
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gold-primary py-3 text-white font-semibold">
              {loading ? "Verifying..." : "Verify Identity"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required className="w-full rounded-lg border p-2.5" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required className="w-full rounded-lg border p-2.5" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gold-primary py-3 text-white font-semibold">
              {loading ? "Saving..." : "Save New Password"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-text-secondary">
          Remember it? <Link href="/login" className="font-semibold text-gold-primary">Login</Link>
        </p>
      </div>
    </div>
  );
}