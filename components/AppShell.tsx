"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPanel = pathname.startsWith("/admin-panel");

  // Admin panel has its own layout with sidebar — no customer header/footer
  if (isAdminPanel) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1 pb-20 md:pb-4">{children}</main>
      <BottomNav />
    </>
  );
}