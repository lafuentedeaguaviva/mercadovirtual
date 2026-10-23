export type ClientClickEvent = {
  businessId: string;
  itemId?: string | null;
  type: "whatsapp_order" | "whatsapp_consult" | "maps" | "booking";
};

/**
 * Registra un evento de clic en el cliente usando navigator.sendBeacon
 * o una promesa desacoplada (fire-and-forget), garantizando que la navegación
 * o apertura de WhatsApp/Maps NUNCA se vea retrasada o bloqueada.
 */
export function recordClickBeacon(event: ClientClickEvent): void {
  try {
    const payload = JSON.stringify(event);

    // Si el navegador soporta sendBeacon y hay endpoint API
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/analytics/track", blob);
      if (sent) return;
    }

    // Fallback: llamada asíncrona no esperada (fire and forget)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Los fallos de telemetría no deben interrumpir la experiencia del usuario
    });
  } catch {
    // Silencio seguro ante contingencias
  }
}
