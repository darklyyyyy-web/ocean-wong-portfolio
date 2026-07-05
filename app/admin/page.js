import AdminProjects from "@/components/AdminProjects";
import HostedAdmin from "@/components/HostedAdmin";
import { getHostedAdminBootstrap } from "@/lib/hosted-cms";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { requireAdminUser } from "@/lib/admin-auth";

export const metadata = {
  title: "管理后台"
};

export default async function AdminPage() {
  if (hasSupabaseConfig()) {
    const user = await requireAdminUser();
    let initialSiteContent = null;
    let initialProjects = [];
    let initialStatus = "";

    try {
      const bootstrap = await getHostedAdminBootstrap();
      initialSiteContent = bootstrap.siteContent;
      initialProjects = bootstrap.projects || [];
    } catch (error) {
      initialStatus = error instanceof Error ? error.message : "后台初始内容读取失败。";
    }

    return (
      <HostedAdmin
        userEmail={user.email}
        initialSiteContent={initialSiteContent}
        initialProjects={initialProjects}
        initialStatus={initialStatus}
      />
    );
  }

  return <AdminProjects />;
}
