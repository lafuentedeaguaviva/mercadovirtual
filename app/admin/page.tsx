import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getBusinessMetrics30DaysAction, type BusinessMetrics30Days } from "@/app/actions/analytics";
import { OnboardingCrearNegocio } from "@/components/admin/OnboardingCrearNegocio";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export default async function AdminPage() {
  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("Error al obtener sesión en /admin:", err);
    redirect("/login?next=/admin");
  }

  if (!user) {
    redirect("/login?next=/admin");
  }

  const userEmail = user.email || (user.user_metadata?.email as string) || "";

  // Cargar negocios del usuario (incluye plaza y puestos hijos)
  let userBusinesses: BusinessRow[] = [];
  try {
    const { data: businesses } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id);
    userBusinesses = (businesses || []) as BusinessRow[];
  } catch (e) {
    console.error("Error al consultar negocios:", e);
  }

  if (userBusinesses.length === 0) {
    return <OnboardingCrearNegocio userEmail={userEmail} />;
  }

  // El negocio principal es el que no tiene parent_id (o el primero)
  const primaryBusiness = userBusinesses.find((b) => !b.parent_id) || userBusinesses[0];

  // Consultar items, reseñas y reservas en paralelo
  const itemsQuery = (async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("business_id", primaryBusiness.id)
      .order("sort_order", { ascending: true });
    return (data || []) as ItemRow[];
  })();

  const reviewsQuery = (async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("business_id", primaryBusiness.id)
      .order("created_at", { ascending: false });
    return (data || []) as ReviewRow[];
  })();

  const bookingsQuery = (async () => {
    if (primaryBusiness.niche !== "agenda") return [];
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("business_id", primaryBusiness.id)
      .order("scheduled_at", { ascending: false });
    return (data || []) as BookingRow[];
  })();

  const metricsQuery = (async () => {
    const res = await getBusinessMetrics30DaysAction(primaryBusiness.id);
    return res.data || {
      whatsappClicks: 0,
      mapsClicks: 0,
      bookingClicks: 0,
      topItems: [],
    };
  })();

  const paymentsQuery = (async () => {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("business_id", primaryBusiness.id)
      .order("created_at", { ascending: false });
    return (data || []) as Database["public"]["Tables"]["payments"]["Row"][];
  })();

  const [items, reviews, bookings, metrics, payments] = await Promise.all([
    itemsQuery,
    reviewsQuery,
    bookingsQuery,
    metricsQuery,
    paymentsQuery,
  ]);

  return (
    <div className="py-2">
      <AdminDashboard
        currentBusiness={primaryBusiness}
        allBusinesses={userBusinesses}
        initialItems={items}
        initialReviews={reviews}
        initialBookings={bookings}
        initialMetrics={metrics}
        initialPayments={payments}
      />
    </div>
  );
}
