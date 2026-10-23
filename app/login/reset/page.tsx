import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FormSolicitarRecuperacion } from "@/components/auth/FormSolicitarRecuperacion";
import { FormDefinirContrasena } from "@/components/auth/FormDefinirContrasena";

export const metadata: Metadata = {
  title: "Recuperar Contraseña | MercadoVirtual Oruro",
  description: "Recupera o define tu contraseña para acceder al panel de MercadoVirtual Oruro.",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {user ? "Definir Nueva Contraseña" : "Recuperar Contraseña"}
        </h1>
        <p className="text-sm text-slate-600">
          {user
            ? "Ingresa tu nueva contraseña para acceder a tu panel de administración."
            : "Te enviaremos un correo para que puedas restablecer tu acceso."}
        </p>
      </div>

      {user ? <FormDefinirContrasena /> : <FormSolicitarRecuperacion />}
    </div>
  );
}
