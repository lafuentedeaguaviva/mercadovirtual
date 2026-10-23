-- ==============================================================================
-- MIGRACIÓN: 002_rate_limit.sql
-- PROYECTO: Plataforma Phygital Multi-Tenant (Oruro, Bolivia)
-- OBJETIVO: Rate Limiting seguro en base de datos PostgreSQL
-- ==============================================================================

-- 1. Tabla de marcas de tiempo para control de peticiones
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW())
);

-- Índice optimizado para búsquedas por clave y ventana de tiempo
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created_at
  ON public.rate_limits (key, created_at DESC);

-- RLS activada sin políticas: acceso bloqueado a anon y authenticated
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. Función atómica para verificar límite de tasa
-- Devuelve TRUE si está dentro del límite permitido (e inserta el intento).
-- Devuelve FALSE si ha excedido el número máximo (p_max) dentro del intervalo (p_window).
-- Limpia concurrentemente registros con más de 1 día de antigüedad para mantener la tabla liviana.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window interval
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
  v_threshold timestamptz;
BEGIN
  v_threshold := TIMEZONE('America/La_Paz', NOW()) - p_window;

  -- Contar peticiones previas en la ventana temporal
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limits
  WHERE key = p_key
    AND created_at >= v_threshold;

  -- Si supera o iguala el máximo, bloquear la petición
  IF v_count >= p_max THEN
    RETURN FALSE;
  END IF;

  -- Registrar la petición actual
  INSERT INTO public.rate_limits (key)
  VALUES (p_key);

  -- Limpieza de registros antiguos (> 1 día)
  DELETE FROM public.rate_limits
  WHERE created_at < (TIMEZONE('America/La_Paz', NOW()) - INTERVAL '1 day');

  RETURN TRUE;
END;
$$;
