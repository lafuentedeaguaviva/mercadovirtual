import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  // Eliminar todas las cookies de sesión acumuladas
  response.cookies.delete("sb-giojycerstuvbzmrzaer-auth-token");
  response.cookies.delete("sb-giojycerstuvbzmrzaer-auth-token.0");
  response.cookies.delete("sb-giojycerstuvbzmrzaer-auth-token.1");
  response.cookies.delete("sb-access-token");
  response.cookies.delete("sb-refresh-token");

  // Encabezado estándar para vaciar todas las cookies del sitio
  response.headers.set("Clear-Site-Data", '"cookies", "storage"');

  return response;
}
