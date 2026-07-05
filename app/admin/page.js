import AdminProjects from "@/components/AdminProjects";
import HostedAdmin from "@/components/HostedAdmin";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { requireAdminUser } from "@/lib/admin-auth";

export const metadata = {
  title: "管理后台"
};

export default async function AdminPage() {
  if (hasSupabaseConfig()) {
    const user = await requireAdminUser();
    return <HostedAdmin userEmail={user.email} />;
  }

  return <AdminProjects />;
}
