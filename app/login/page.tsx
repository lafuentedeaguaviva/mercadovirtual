import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { parseSearchParam, sanitizeRedirectUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Iniciar Sesión | MercadoVirtual Oruro",
  description: "Accede al panel de administración de tu catálogo phygital en MercadoVirtual Oruro.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; tab?: string | string[] }>;
}) {
  const resolvedParams = await searchParams;
  const rawNext = parseSearchParam(resolvedParams.next);
  const rawTab = parseSearchParam(resolvedParams.tab);
  // Sanitización de next: solo rutas internas relativas que no comiencen con //
  const nextUrl = rawNext ? sanitizeRedirectUrl(rawNext, "") : "";
  const initialTab = rawTab === "register" ? "register" : "login";

  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Iniciar Sesión</h1>
        <p className="text-sm text-slate-600">
          Accede al panel de administración de tu catálogo o negocio en Oruro.
        </p>
      </div>

      <LoginForm initialNext={nextUrl} initialTab={initialTab} />
    </div>
  );
}
