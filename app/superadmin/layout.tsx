import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Database } from "@/types/database";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/superadmin");
  }

  // Comprobar rol superadmin en profiles
  const { data } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
  const profile = data as Pick<ProfileRow, "role" | "full_name"> | null;

  if (!profile || profile.role !== "superadmin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* Luces y degradados ambientales de fondo (Cyber/Fintech glow) */}
      <div className="pointer-events-none absolute -top-40 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-60 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />

      {/* Barra de navegación superior superadmin estilo Glassmorphism Dark */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/superadmin"
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all duration-300">
                  <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                    <span className="font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-300 text-sm tracking-wider">
                      MV
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base tracking-tight leading-tight group-hover:text-indigo-300 transition-colors">
                      Superadmin
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      PRO
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                    MercadoVirtual Oruro • Red 3D
                  </span>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Finanzas & Suscripciones
                </span>
                <Link
                  href="/"
                  target="_blank"
                  className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1 border border-transparent hover:border-slate-700"
                >
                  <span>Portal Principal</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="text-right hidden sm:block">
                <p className="font-bold text-slate-200 leading-tight">
                  {profile.full_name || "Superadministrador"}
                </p>
                <p className="text-[11px] text-slate-400 font-mono tracking-tight">{user.email}</p>
              </div>
              <Link
                href="/admin"
                className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-200 border border-slate-700/80 shadow-md flex items-center gap-1.5 hover:shadow-indigo-500/20"
              >
                <span>🏢 Mi Negocio</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal con contenedor con atmósfera dark */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        {children}
      </main>
    </div>
  );
}
