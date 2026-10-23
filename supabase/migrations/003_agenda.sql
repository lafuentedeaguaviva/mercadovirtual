-- ==============================================================================
-- MIGRACIÓN: 003_agenda.sql
-- PROYECTO: Plataforma Phygital Multi-Tenant (Oruro, Bolivia)
-- OBJETIVO: Horarios y reservas seguras para agendas y consultorios
-- ==============================================================================

-- 1. Agregar columna schedule a businesses con valor por defecto y validación
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS schedule jsonb NOT NULL DEFAULT '{
  "days": [1, 2, 3, 4, 5],
  "morning": ["08:00", "12:00"],
  "afternoon": ["14:30", "19:00"],
  "slot_minutes": 30
}'::jsonb;

-- Validación CHECK para la estructura del schedule
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_business_schedule_structure'
  ) THEN
    ALTER TABLE public.businesses
    ADD CONSTRAINT check_business_schedule_structure CHECK (
      schedule ? 'days' AND
      schedule ? 'morning' AND
      schedule ? 'afternoon' AND
      schedule ? 'slot_minutes' AND
      jsonb_typeof(schedule->'days') = 'array' AND
      jsonb_typeof(schedule->'slot_minutes') = 'number'
    );
  END IF;
END $$;

-- 2. Función RPC get_busy_slots (Pública y Segura)
-- Devuelve ÚNICAMENTE la lista de marcas temporales (scheduled_at) de reservas no canceladas
-- Nunca expone client_name, client_phone ni datos sensibles.
CREATE OR REPLACE FUNCTION public.get_busy_slots(
  p_business_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE (
  busy_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validar que el negocio exista y esté activo
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id AND b.is_active = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.scheduled_at
  FROM public.bookings b
  WHERE b.business_id = p_business_id
    AND b.status <> 'cancelada'
    AND b.scheduled_at >= (p_from::timestamptz)
    AND b.scheduled_at <= (p_to::timestamptz + INTERVAL '1 day')
  ORDER BY b.scheduled_at ASC;
END;
$$;
