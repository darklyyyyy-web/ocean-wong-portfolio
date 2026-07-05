import { redirect } from "next/navigation";
import AdminLogin from "@/components/AdminLogin";
import { getAdminUser } from "@/lib/admin-auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export const metadata = {
  title: "后台登录"
};

export default async function AdminLoginPage() {
  if (!hasSupabaseConfig()) {
    redirect("/admin");
  }

  const user = await getAdminUser();
  if (user) {
    redirect("/admin");
  }

  return <AdminLogin />;
}

