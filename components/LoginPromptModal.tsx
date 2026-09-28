"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
};

export default function LoginPromptModal({
  open,
  onClose,
  title = "Login to continue",
  message = "Please login or create an account to place your order.",
}: Props) {
  const router = useRouter();

  if (!open) return null;

  const handleLogin = () => {
    onClose();
    router.push("/login");
  };

  const handleSignup = () => {
    onClose();
    router.push("/signup");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex flex-col items-center px-6 pt-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-orange text-3xl">
            🔐
          </div>

          <h2 className="mt-4 font-serif text-lg font-bold text-text-primary md:text-xl">
            {title}
          </h2>
          <p className="mt-2 text-xs text-text-muted md:text-sm">{message}</p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-5 space-y-2.5">
          <button
            onClick={handleLogin}
            className="block w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
          >
            Login
          </button>
          <button
            onClick={handleSignup}
            className="block w-full rounded-lg border-2 border-gold-primary bg-white py-3 text-sm font-semibold text-gold-primary transition hover:bg-bg-orange"
          >
            Create Account
          </button>
          <button
            onClick={onClose}
            className="block w-full py-2 text-xs font-medium text-text-muted transition hover:text-text-primary md:text-sm"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}