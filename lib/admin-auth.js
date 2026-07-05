import { redirect } from "next/navigation";
import { adminEmail, hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const result = await supabase.auth.getUser();
  const user = result?.data?.user || null;

  if (!user || !user.email) {
    return null;
  }

  if (adminEmail && user.email !== adminEmail) {
    return null;
  }

  return user;
}

export async function requireAdminUser() {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function requireAdminApiUser() {
  const user = await getAdminUser();

  if (!user) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  return user;
}
