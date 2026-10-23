import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { verifySuperAdmin } from "@/app/actions/superadmin";
import { FormNuevoNegocio } from "@/components/superadmin/FormNuevoNegocio";

export const metadata: Metadata = {
  title: "Alta de Negocio y Cliente | Superadmin MercadoVirtual",
  description: "Formulario para registrar nuevos negocios, invitar propietarios y configurar catálogos en Oruro.",
};

export default async function NuevoNegocioPage() {
  // Asegura autenticación y rol de superadmin en el servidor
  await verifySuperAdmin();

  const supabase = await createClient();

  // Obtener plazas de comidas activas para permitir asociar puestos hijos
  const { data: plazas } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("niche", "plaza_comidas")
    .is("parent_id", null)
    .order("name", { ascending: true });

  const plazasList = (plazas as Array<{ id: string; name: string }> | null) || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Encabezado con navegación de regreso */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/superadmin" className="hover:text-sky-600 transition-colors">
              Superadmin
            </Link>
            <span>/</span>
            <Link href="/superadmin/cobros" className="hover:text-sky-600 transition-colors">
              Cobros
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Nuevo Negocio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Alta de Negocio y Cliente
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Crea el catálogo comercial, asigna parámetros de suscripción e invita al dueño por correo electrónico.
          </p>
        </div>

        <Link
          href="/superadmin"
          className="self-start sm:self-auto min-h-[44px] px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Regresar al Panel</span>
        </Link>
      </div>

      {/* Formulario */}
      <FormNuevoNegocio plazas={plazasList} />
    </div>
  );
}
