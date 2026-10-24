import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // REGLA OBLIGATORIA: Usar siempre getUser() para autenticación segura en el servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Protección de rutas /admin/*: exige usuario autenticado
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
      const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      const redirectUrl = new URL(`/login?next=${encodeURIComponent(pathname)}`, `${proto}://${host}`);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. Protección de rutas /superadmin/*: exige perfil con rol 'superadmin'
  if (pathname.startsWith("/superadmin")) {
    if (!user) {
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
      const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      const redirectUrl = new URL(`/login?next=${encodeURIComponent(pathname)}`, `${proto}://${host}`);
      return NextResponse.redirect(redirectUrl);
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    type ProfileRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];
    const userRole = (data as { role: ProfileRole } | null)?.role;

    if (!userRole || userRole !== "superadmin") {
      // Redirigir a la página principal si el usuario no tiene permisos de superadmin
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica el proxy a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico y archivos con extensión (png, jpg, svg, webp, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
