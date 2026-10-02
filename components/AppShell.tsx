"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import {
  trackVisit,
  shouldRunCleanup,
  markCleanupDone,
  cleanupOldAnalytics,
} from "@/lib/firestoreAnalytics";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPanel = pathname.startsWith("/admin-panel");

  useEffect(() => {
    if (isAdminPanel) return;

    const KEY = "cdb_visit_tracked";
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");

    trackVisit().catch(() => {});

    if (shouldRunCleanup()) {
      cleanupOldAnalytics().then(() => markCleanupDone()).catch(() => {});
    }
  }, [isAdminPanel]);

  if (isAdminPanel) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1 pb-20 md:pb-4">{children}</main>
      <Footer />
      <BottomNav />
    </>
  );
}