import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Endpoint de ejecución diaria de mark_overdue().
 * Protegido mediante comparación en tiempo constante de CRON_SECRET.
 * Puede ser llamado por Hostinger Cron Jobs o curl:
 * curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://dominio.com/api/cron/mark-overdue
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Servicio no configurado: CRON_SECRET no está definido en el servidor." },
      { status: 500 }
    );
  }

  // Extraer token de cabecera Authorization: Bearer <token> o x-cron-secret
  const authHeader = request.headers.get("authorization");
  const customHeader = request.headers.get("x-cron-secret");

  let providedToken = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedToken = authHeader.slice(7).trim();
  } else if (customHeader) {
    providedToken = customHeader.trim();
  }

  // Comparación en tiempo constante para mitigar ataques de temporización (timing attacks)
  const isMatch = (() => {
    try {
      const bufferProvided = Buffer.from(providedToken, "utf8");
      const bufferSecret = Buffer.from(cronSecret, "utf8");

      if (bufferProvided.length !== bufferSecret.length) {
        return false;
      }
      return timingSafeEqual(bufferProvided, bufferSecret);
    } catch {
      return false;
    }
  })();

  if (!isMatch) {
    return NextResponse.json(
      { error: "No autorizado. Token de cron inválido." },
      { status: 401 }
    );
  }

  try {
    const adminSupabase = createAdminClient();

    // Invocar la función RPC mark_overdue() con privilegios de service role
    const { data: affectedRows, error } = await adminSupabase.rpc("mark_overdue");

    if (error) {
      console.error("Error al ejecutar mark_overdue en cron:", error);
      return NextResponse.json(
        { error: "Error al actualizar estados en la base de datos.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Proceso mark_overdue ejecutado correctamente.",
      affected_businesses: affectedRows ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("Excepción en cron mark_overdue:", err);
    return NextResponse.json(
      { error: "Excepción inesperada en el servidor al ejecutar cron." },
      { status: 500 }
    );
  }
}
