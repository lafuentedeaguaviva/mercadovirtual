import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://giojycerstuvbzmrzaer.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_mAe2xSSpkKpMzLW5VCUEaQ_y2asboqx";

  return createBrowserClient<Database>(url, anonKey);
}
