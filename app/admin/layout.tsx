import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    redirect("/login?next=/admin");
  }

  if (!user) {
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
