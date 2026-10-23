import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectUrl } from "@/lib/utils";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  const safeNext = sanitizeRedirectUrl(next, "/admin");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
    console.error("Error al intercambiar código de autenticación:", error);
  }

  // Si falló el código o expiró, redirigir al login con mensaje
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("Enlace expirado o no válido.")}`, requestUrl.origin)
  );
}
