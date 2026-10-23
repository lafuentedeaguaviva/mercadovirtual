-- ==============================================================================
-- MIGRACIÓN: 004_metrics.sql
-- PROYECTO: Plataforma Phygital Multi-Tenant (Oruro, Bolivia)
-- OBJETIVO: Analítica ligera propia, tabla click_events, RPC track_click y RLS
-- ==============================================================================

-- 1. Tabla de eventos de clics
CREATE TABLE IF NOT EXISTS public.click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('whatsapp_order', 'whatsapp_consult', 'maps', 'booking')),
  created_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW())
);

-- Índices de consulta de rendimiento para panel de control del owner y agregaciones
CREATE INDEX IF NOT EXISTS idx_click_events_business_created
  ON public.click_events (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_events_business_item
  ON public.click_events (business_id, item_id)
  WHERE item_id IS NOT NULL;

-- 2. Habilitar RLS
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

-- Política de SELECT:
-- 1. El superadmin puede ver todos los eventos.
-- 2. El owner solo puede ver eventos de sus propios negocios (o puestos de su plaza).
DROP POLICY IF EXISTS "click_events_select_policy" ON public.click_events;
CREATE POLICY "click_events_select_policy"
  ON public.click_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = click_events.business_id
        AND (
          b.owner_id = auth.uid()
          OR (b.parent_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.businesses pb WHERE pb.id = b.parent_id AND pb.owner_id = auth.uid()
          ))
        )
    )
  );

-- No se permite INSERT directo para usuarios comunes; solo a través de la función SECURITY DEFINER
DROP POLICY IF EXISTS "click_events_insert_policy" ON public.click_events;

-- 3. RPC track_click
-- Valida que el negocio exista y esté activo (is_active = true)
-- Aplica check_rate_limit: máximo 60 clics por minuto por IP/negocio para prevenir spam
CREATE OR REPLACE FUNCTION public.track_click(
  p_business_id uuid,
  p_item_id uuid DEFAULT NULL,
  p_type text DEFAULT 'whatsapp_consult'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_active boolean;
  v_rate_limit_key text;
  v_allowed boolean;
BEGIN
  -- Validar tipo
  IF p_type NOT IN ('whatsapp_order', 'whatsapp_consult', 'maps', 'booking') THEN
    RETURN FALSE;
  END IF;

  -- 1. Validar que el negocio exista y esté activo
  SELECT is_active INTO v_is_active
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_is_active IS NULL OR v_is_active = FALSE THEN
    RETURN FALSE;
  END IF;

  -- 2. Validar rate limit (máximo 60 clics cada 1 minuto por negocio)
  v_rate_limit_key := 'click_' || p_business_id::text || '_' || COALESCE(auth.uid()::text, 'anon');
  v_allowed := public.check_rate_limit(v_rate_limit_key, 60, INTERVAL '1 minute');

  IF NOT v_allowed THEN
    RETURN FALSE;
  END IF;

  -- 3. Insertar el evento
  INSERT INTO public.click_events (business_id, item_id, type)
  VALUES (p_business_id, p_item_id, p_type);

  RETURN TRUE;
END;
$$;
