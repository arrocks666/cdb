import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const runtime = "nodejs";

export default async function AdminPanelRoot() {
  const authed = await isAdminAuthenticated();

  if (authed) {
    redirect("/admin-panel/dashboard");
  } else {
    redirect("/admin-panel/login");
  }
}