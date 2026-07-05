export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const supabaseBucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "portfolio";
export const adminEmail = process.env.ADMIN_EMAIL || "";

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

