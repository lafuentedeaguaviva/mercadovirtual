import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PanelFinancieroClient } from "@/components/superadmin/PanelFinancieroClient";
import type { Database } from "@/types/database";

export const metadata = {
  title: "Panel Financiero Superadmin | MercadoVirtual Oruro",
  description: "Monitoreo de suscripciones, estados de pago, MRR y cobros de negocios.",
};

type SubscriptionRow = Database["public"]["Views"]["superadmin_subscriptions"]["Row"];

export default async function SuperAdminFinancesPage() {
  const supabase = await createClient();

  // 1. Obtener la lista completa de suscripciones desde la vista security_invoker superadmin_subscriptions
  // Para evitar N+1, la vista agrupa conteo de items y propietario directamente en PostgreSQL
  const { data: rawSubscriptions, error: subError } = await supabase
    .from("superadmin_subscriptions")
    .select("*")
    .order("next_due_date", { ascending: true });

  let subscriptions: SubscriptionRow[] = [];

  // Fallback de contingencia si la vista aún no fue migrada en la instancia activa de Supabase
  if (subError || !rawSubscriptions) {
    const adminSupabase = createAdminClient();
    const { data: businesses } = await adminSupabase
      .from("businesses")
      .select("*, items(id), profiles(full_name)")
      .order("next_due_date", { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriptions = ((businesses || []) as any[]).map((b) => ({
      business_id: b.id,
      name: b.name,
      slug: b.slug,
      niche: b.niche,
      plan_name: b.plan_name,
      items_en_uso: Array.isArray(b.items) ? b.items.length : 0,
      max_items: b.max_items,
      subscription_price: Number(b.subscription_price) || 0,
      billing_cycle: b.billing_cycle,
      next_due_date: b.next_due_date,
      payment_status: b.payment_status,
      is_active: b.is_active,
      whatsapp: b.whatsapp,
      owner_id: b.owner_id,
      owner_name: b.profiles?.full_name || null,
      owner_email: null,
      created_at: b.created_at,
    }));
  } else {
    subscriptions = rawSubscriptions as SubscriptionRow[];
  }

  // 2. Cálculo de KPIs
  const totalBusinesses = subscriptions.length;
  const activeBusinesses = subscriptions.filter((s) => s.is_active).length;

  // MRR proyectado en Bs: suma de suscripción de negocios activos normalizado a mensual
  const mrrProjected = subscriptions
    .filter((s) => s.is_active)
    .reduce((acc, curr) => {
      const price = Number(curr.subscription_price) || 0;
      if (curr.billing_cycle === "anual") {
        return acc + price / 12;
      }
      return acc + price;
    }, 0);

  // Contadores por estado de cartera
  const countAlDia = subscriptions.filter((s) => s.payment_status === "al_dia").length;
  const countPendiente = subscriptions.filter((s) => s.payment_status === "pendiente").length;
  const countVencido = subscriptions.filter((s) => s.payment_status === "vencido").length;

  // 3. Ingresos cobrados en el mes actual (suma de payments del mes en curso)
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)).toISOString();
  const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)).toISOString();

  const { data: monthPayments } = await supabase
    .from("payments")
    .select("amount")
    .gte("created_at", startOfMonth)
    .lte("created_at", endOfMonth);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentsList = (monthPayments as any[]) || [];
  const collectedCurrentMonth = paymentsList.reduce(
    (acc, curr) => acc + (Number(curr?.amount) || 0),
    0
  );

  return (
    <PanelFinancieroClient
      initialSubscriptions={subscriptions}
      totalBusinesses={totalBusinesses}
      activeBusinesses={activeBusinesses}
      mrrProjected={mrrProjected}
      countAlDia={countAlDia}
      countPendiente={countPendiente}
      countVencido={countVencido}
      collectedCurrentMonth={collectedCurrentMonth}
    />
  );
}
