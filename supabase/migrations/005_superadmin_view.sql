-- ==============================================================================
-- MIGRACIÓN: 005_superadmin_view.sql
-- PROYECTO: Plataforma Phygital Multi-Tenant (Oruro, Bolivia)
-- OBJETIVO: Vista SQL superadmin_subscriptions con security_invoker para panel financiero
-- ==============================================================================

-- Vista optimizada sin N+1 que consolida datos de negocios, conteo de items y propietario
CREATE OR REPLACE VIEW public.superadmin_subscriptions
WITH (security_invoker = true)
AS
SELECT
  b.id AS business_id,
  b.name AS name,
  b.slug AS slug,
  b.niche AS niche,
  b.plan_name AS plan_name,
  COALESCE(i.items_count, 0)::integer AS items_en_uso,
  b.max_items AS max_items,
  b.subscription_price::numeric(10,2) AS subscription_price,
  b.billing_cycle AS billing_cycle,
  b.next_due_date AS next_due_date,
  b.payment_status AS payment_status,
  b.is_active AS is_active,
  b.whatsapp AS whatsapp,
  p.id AS owner_id,
  p.full_name AS owner_name,
  u.email AS owner_email,
  b.created_at AS created_at
FROM public.businesses b
LEFT JOIN public.profiles p ON p.id = b.owner_id
LEFT JOIN auth.users u ON u.id = b.owner_id
LEFT JOIN (
  SELECT business_id, COUNT(*)::integer AS items_count
  FROM public.items
  GROUP BY business_id
) i ON i.business_id = b.id;

-- Comentario explicativo
COMMENT ON VIEW public.superadmin_subscriptions IS 'Vista agregada para el panel financiero del Superadmin con métricas de negocios y suscripción.';
