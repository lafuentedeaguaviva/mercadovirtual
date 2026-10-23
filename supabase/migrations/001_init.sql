-- ==============================================================================
-- MIGRACIÓN: 001_init.sql
-- PROYECTO: Plataforma Phygital Multi-Tenant (Oruro, Bolivia)
-- ARQUITECTURA: Supabase PostgreSQL (Idempotente, RLS estricto, Storage, Triggers)
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONES Y UTILIDADES BÁSICAS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Función genérica para actualización de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('America/La_Paz', NOW());
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 2. PERFILES Y ROLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'superadmin')) DEFAULT 'owner',
  full_name text,
  created_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW()),
  updated_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW())
);

-- Trigger updated_at para profiles
DROP TRIGGER IF EXISTS tr_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Función SECURITY DEFINER para chequear superadmin con search_path aislado
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN (v_role = 'superadmin');
END;
$$;

-- Trigger para evitar que un usuario común altere su propio role
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_superadmin() THEN
      RAISE EXCEPTION 'Operación denegada: Solo un superadmin puede modificar roles de usuario.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_profile_role_self_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_profile_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_self_escalation();

-- Trigger sobre auth.users para crear profile automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. TABLAS PRINCIPALES
-- ==============================================================================

-- 3.1 BUSINESSES (Negocios / Comercios / Plazas de comidas / Hijos de plaza)
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  niche text NOT NULL CHECK (niche IN ('comercio', 'inmueble', 'agenda', 'plaza_comidas')),
  catalog_mode text NOT NULL CHECK (catalog_mode IN ('carrito', 'vitrina')),
  whatsapp text NOT NULL CHECK (whatsapp ~ '^591[0-9]{8}$'),
  logo_url text,
  banner_url text,
  description text,
  address text,
  maps_url text,
  city text NOT NULL DEFAULT 'Oruro',
  theme jsonb NOT NULL DEFAULT '{"primary_color": "#0ea5e9"}'::jsonb,
  plan_name text NOT NULL DEFAULT 'basico',
  max_items integer NOT NULL DEFAULT 50 CHECK (max_items >= 0),
  subscription_price numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (subscription_price >= 0),
  billing_cycle text NOT NULL DEFAULT 'mensual' CHECK (billing_cycle IN ('mensual', 'anual', 'indefinido')),
  payment_status text NOT NULL DEFAULT 'al_dia' CHECK (payment_status IN ('al_dia', 'pendiente', 'vencido')),
  next_due_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  is_active boolean NOT NULL DEFAULT true,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0.00 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  created_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW()),
  updated_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW()),

  -- Regla: Slug en minúsculas, guiones, alfanumérico entre 3 y 60 caracteres
  CONSTRAINT check_business_slug_format CHECK (slug ~ '^[a-z0-9-]{3,60}$'),

  -- Regla: Slugs reservados protegidos
  CONSTRAINT check_business_slug_not_reserved CHECK (
    slug NOT IN ('admin', 'superadmin', 'api', 'login', '_next', 'auth', 'dashboard', 'settings', 'checkout')
  ),

  -- Regla: primary_color debe ser un valor hexadecimal válido (#RGB o #RRGGBB o #RRGGBBAA)
  CONSTRAINT check_business_theme_primary_color CHECK (
    theme ? 'primary_color' AND (theme->>'primary_color') ~* '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$'
  )
);

-- Trigger updated_at para businesses
DROP TRIGGER IF EXISTS tr_businesses_set_updated_at ON public.businesses;
CREATE TRIGGER tr_businesses_set_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Validación adicional para parent_id: "El padre no puede tener a su vez un padre" (máximo 1 nivel jerárquico)
CREATE OR REPLACE FUNCTION public.check_business_parent_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grandparent_id uuid;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.parent_id = NEW.id THEN
      RAISE EXCEPTION 'Un negocio no puede ser su propio padre.';
    END IF;

    SELECT b.parent_id INTO v_grandparent_id
    FROM public.businesses b
    WHERE b.id = NEW.parent_id;

    IF v_grandparent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Jerarquía inválida: El negocio padre no puede tener a su vez otro padre (máximo 1 nivel).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_business_parent_hierarchy ON public.businesses;
CREATE TRIGGER tr_check_business_parent_hierarchy
  BEFORE INSERT OR UPDATE OF parent_id ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.check_business_parent_hierarchy();

-- 3.2 ITEMS (Productos, Catálogos, Inmuebles, Servicios de agenda)
CREATE TABLE IF NOT EXISTS public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) >= 2 AND char_length(title) <= 200),
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  images text[] NOT NULL DEFAULT ARRAY[]::text[] CHECK (cardinality(images) <= 5),
  status text NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'agotado', 'reservado', 'vendido')),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW()),
  updated_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW())
);

-- Trigger updated_at para items
DROP TRIGGER IF EXISTS tr_items_set_updated_at ON public.items;
CREATE TRIGGER tr_items_set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.3 BOOKINGS (Reservas / Citas / Agendas)
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  client_name text NOT NULL CHECK (char_length(trim(client_name)) >= 2 AND char_length(client_name) <= 150),
  client_phone text NOT NULL CHECK (char_length(trim(client_phone)) >= 7 AND char_length(client_phone) <= 30),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmada', 'cancelada')),
  notes text CHECK (char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW()),
  updated_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW())
);

-- Trigger updated_at para bookings
DROP TRIGGER IF EXISTS tr_bookings_set_updated_at ON public.bookings;
CREATE TRIGGER tr_bookings_set_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- UNIQUE parcial para evitar doble reserva simultánea activa en un negocio
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_business_scheduled_active
  ON public.bookings (business_id, scheduled_at)
  WHERE status <> 'cancelada';

-- 3.4 REVIEWS (Reseñas de clientes con moderación)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text CHECK (char_length(comment) <= 500),
  author_name text NOT NULL DEFAULT 'Anónimo' CHECK (char_length(trim(author_name)) >= 1 AND char_length(author_name) <= 100),
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW()),
  updated_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW())
);

-- Trigger updated_at para reviews
DROP TRIGGER IF EXISTS tr_reviews_set_updated_at ON public.reviews;
CREATE TRIGGER tr_reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.5 PAYMENTS (Pagos de suscripción - solo registrables por superadmin)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'qr' CHECK (method IN ('qr', 'transferencia', 'efectivo', 'otro')),
  notes text,
  recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW()),
  updated_at timestamptz NOT NULL DEFAULT TIMEZONE('America/La_Paz', NOW())
);

-- Trigger updated_at para payments
DROP TRIGGER IF EXISTS tr_payments_set_updated_at ON public.payments;
CREATE TRIGGER tr_payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ==============================================================================
-- 4. LÓGICA DE NEGOCIO EN BASE DE DATOS (TRIGGERS Y RPC)
-- ==============================================================================

-- 4.1 Trigger: Validación estricta de max_items antes de insertar en items
CREATE OR REPLACE FUNCTION public.check_item_limit_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max_items integer;
  v_current_count integer;
BEGIN
  SELECT b.max_items INTO v_max_items
  FROM public.businesses b
  WHERE b.id = NEW.business_id;

  IF v_max_items IS NULL THEN
    RAISE EXCEPTION 'Negocio no encontrado (%s)', NEW.business_id;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.items i
  WHERE i.business_id = NEW.business_id;

  IF v_current_count >= v_max_items THEN
    RAISE EXCEPTION 'Límite alcanzado: Este negocio tiene una capacidad máxima de % items. Actualiza tu plan.', v_max_items;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_item_limit_before_insert ON public.items;
CREATE TRIGGER tr_check_item_limit_before_insert
  BEFORE INSERT ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_item_limit_before_insert();

-- 4.2 Trigger: Recalcular rating_avg y rating_count de businesses según reviews aprobadas
CREATE OR REPLACE FUNCTION public.recalculate_business_ratings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_business_id uuid;
  v_new_avg numeric(3,2);
  v_new_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_business_id := OLD.business_id;
  ELSE
    v_target_business_id := NEW.business_id;
  END IF;

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00),
    COUNT(*)
  INTO
    v_new_avg,
    v_new_count
  FROM public.reviews
  WHERE business_id = v_target_business_id
    AND is_approved = true;

  UPDATE public.businesses
  SET
    rating_avg = v_new_avg,
    rating_count = v_new_count
  WHERE id = v_target_business_id;

  -- Si se cambió el business_id (caso muy raro de update), actualizamos también el anterior
  IF TG_OP = 'UPDATE' AND OLD.business_id IS DISTINCT FROM NEW.business_id THEN
    SELECT
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00),
      COUNT(*)
    INTO
      v_new_avg,
      v_new_count
    FROM public.reviews
    WHERE business_id = OLD.business_id
      AND is_approved = true;

    UPDATE public.businesses
    SET
      rating_avg = v_new_avg,
      rating_count = v_new_count
    WHERE id = OLD.business_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_recalculate_business_ratings ON public.reviews;
CREATE TRIGGER tr_recalculate_business_ratings
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_business_ratings();

-- 4.3 Trigger: Proteger campos críticos de businesses para que el owner no pueda modificarlos
CREATE OR REPLACE FUNCTION public.protect_business_restricted_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Si quien ejecuta es superadmin o proceso de migración de base sin usuario web, se permite
  IF public.is_superadmin() THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.plan_name IS DISTINCT FROM OLD.plan_name OR
    NEW.max_items IS DISTINCT FROM OLD.max_items OR
    NEW.subscription_price IS DISTINCT FROM OLD.subscription_price OR
    NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
    NEW.next_due_date IS DISTINCT FROM OLD.next_due_date OR
    NEW.is_active IS DISTINCT FROM OLD.is_active OR
    NEW.owner_id IS DISTINCT FROM OLD.owner_id OR
    NEW.parent_id IS DISTINCT FROM OLD.parent_id OR
    NEW.slug IS DISTINCT FROM OLD.slug
  ) THEN
    RAISE EXCEPTION 'Operación restringida: Solo un superadmin puede alterar campos de suscripción, estado, slug, jerarquía o propietario.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_business_restricted_fields ON public.businesses;
CREATE TRIGGER tr_protect_business_restricted_fields
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_business_restricted_fields();

-- 4.4 RPC: register_payment (Solo superadmin, atómico)
CREATE OR REPLACE FUNCTION public.register_payment(
  p_business_id uuid,
  p_amount numeric,
  p_method text DEFAULT 'qr',
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_current_due date;
  v_new_due date;
  v_today date := CURRENT_DATE;
  v_payment_id uuid;
BEGIN
  -- Validar rol superadmin
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Acceso denegado: Solo el superadmin puede registrar pagos.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0.';
  END IF;

  -- Obtener fecha de vencimiento actual del negocio
  SELECT next_due_date INTO v_current_due
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_current_due IS NULL THEN
    RAISE EXCEPTION 'Negocio no encontrado (%s)', p_business_id;
  END IF;

  -- Si ya venció (o vence hoy/antes), sumar 30 días a partir de hoy. Si no, a partir de su vencimiento futuro.
  IF v_current_due < v_today THEN
    v_new_due := v_today + INTERVAL '30 days';
  ELSE
    v_new_due := v_current_due + INTERVAL '30 days';
  END IF;

  -- 1. Insertar el pago
  INSERT INTO public.payments (
    business_id,
    amount,
    method,
    notes,
    recorded_by
  ) VALUES (
    p_business_id,
    p_amount,
    p_method,
    p_notes,
    v_caller_id
  ) RETURNING id INTO v_payment_id;

  -- 2. Actualizar estado y fecha en businesses
  UPDATE public.businesses
  SET
    next_due_date = v_new_due,
    payment_status = 'al_dia',
    is_active = true
  WHERE id = p_business_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'new_due_date', v_new_due,
    'payment_status', 'al_dia',
    'is_active', true
  );
END;
$$;

-- 4.5 RPC: mark_overdue (Para ejecución automática en pg_cron o trigger de mantenimiento)
CREATE OR REPLACE FUNCTION public.mark_overdue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Solo superadmin o tareas internas del sistema pueden ejecutarlo manualmente
  IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  WITH updated AS (
    UPDATE public.businesses
    SET
      payment_status = 'vencido',
      is_active = false
    WHERE next_due_date < CURRENT_DATE
      AND payment_status <> 'vencido'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;


-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5.1 Helper functions para evaluación rápida en RLS
CREATE OR REPLACE FUNCTION public.is_business_accessible_for_owner(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND (
        b.owner_id = v_uid OR
        EXISTS (
          SELECT 1 FROM public.businesses parent
          WHERE parent.id = b.parent_id AND parent.owner_id = v_uid
        )
      )
  );
END;
$$;

-- 5.2 POLICIES: PROFILES
DROP POLICY IF EXISTS "profiles_select_own_or_superadmin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_superadmin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_superadmin());

DROP POLICY IF EXISTS "profiles_update_own_or_superadmin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_superadmin"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_superadmin())
  WITH CHECK (auth.uid() = id OR public.is_superadmin());

-- 5.3 POLICIES: BUSINESSES
-- Público: Solo lectura si el negocio está activo
DROP POLICY IF EXISTS "businesses_select_public" ON public.businesses;
CREATE POLICY "businesses_select_public"
  ON public.businesses FOR SELECT
  USING (
    is_active = true OR
    public.is_superadmin() OR
    (auth.uid() IS NOT NULL AND (owner_id = auth.uid() OR public.is_business_accessible_for_owner(id)))
  );

-- Owner: Modificar su negocio o puestos de su plaza
DROP POLICY IF EXISTS "businesses_update_owner" ON public.businesses;
CREATE POLICY "businesses_update_owner"
  ON public.businesses FOR UPDATE
  USING (
    public.is_superadmin() OR
    (auth.uid() IS NOT NULL AND (owner_id = auth.uid() OR public.is_business_accessible_for_owner(id)))
  )
  WITH CHECK (
    public.is_superadmin() OR
    (auth.uid() IS NOT NULL AND (owner_id = auth.uid() OR public.is_business_accessible_for_owner(id)))
  );

-- Insert/Delete de businesses: Superadmin (o creación guiada por owner para puestos hijos si es plaza)
DROP POLICY IF EXISTS "businesses_insert_superadmin" ON public.businesses;
CREATE POLICY "businesses_insert_superadmin"
  ON public.businesses FOR INSERT
  WITH CHECK (
    public.is_superadmin() OR
    (
      auth.uid() IS NOT NULL AND
      owner_id = auth.uid() AND
      parent_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.businesses pb
        WHERE pb.id = parent_id AND pb.owner_id = auth.uid() AND pb.niche = 'plaza_comidas'
      )
    )
  );

DROP POLICY IF EXISTS "businesses_delete_superadmin" ON public.businesses;
CREATE POLICY "businesses_delete_superadmin"
  ON public.businesses FOR DELETE
  USING (public.is_superadmin());

-- 5.4 POLICIES: ITEMS
-- Público: Lectura solo de negocios activos
DROP POLICY IF EXISTS "items_select_public" ON public.items;
CREATE POLICY "items_select_public"
  ON public.items FOR SELECT
  USING (
    public.is_superadmin() OR
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = items.business_id
        AND (
          b.is_active = true OR
          b.owner_id = auth.uid() OR
          public.is_business_accessible_for_owner(b.id)
        )
    )
  );

-- Owner/Superadmin: INSERT
DROP POLICY IF EXISTS "items_insert_owner_or_admin" ON public.items;
CREATE POLICY "items_insert_owner_or_admin"
  ON public.items FOR INSERT
  WITH CHECK (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  );

-- Owner/Superadmin: UPDATE
DROP POLICY IF EXISTS "items_update_owner_or_admin" ON public.items;
CREATE POLICY "items_update_owner_or_admin"
  ON public.items FOR UPDATE
  USING (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  )
  WITH CHECK (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  );

-- Owner/Superadmin: DELETE
DROP POLICY IF EXISTS "items_delete_owner_or_admin" ON public.items;
CREATE POLICY "items_delete_owner_or_admin"
  ON public.items FOR DELETE
  USING (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  );

-- 5.5 POLICIES: BOOKINGS
-- Público / Clientes: Insertar reserva con negocio activo
DROP POLICY IF EXISTS "bookings_insert_public" ON public.bookings;
CREATE POLICY "bookings_insert_public"
  ON public.bookings FOR INSERT
  WITH CHECK (
    char_length(trim(client_name)) >= 2 AND
    char_length(trim(client_phone)) >= 7 AND
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.is_active = true
    )
  );

-- Owner / Superadmin: Leer y gestionar reservas de sus negocios
DROP POLICY IF EXISTS "bookings_select_owner_or_admin" ON public.bookings;
CREATE POLICY "bookings_select_owner_or_admin"
  ON public.bookings FOR SELECT
  USING (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  );

DROP POLICY IF EXISTS "bookings_update_owner_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_owner_or_admin"
  ON public.bookings FOR UPDATE
  USING (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  )
  WITH CHECK (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  );

-- 5.6 POLICIES: REVIEWS
-- Público: Solo reseñas aprobadas de negocios activos
DROP POLICY IF EXISTS "reviews_select_approved" ON public.reviews;
CREATE POLICY "reviews_select_approved"
  ON public.reviews FOR SELECT
  USING (
    (
      is_approved = true AND
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = reviews.business_id AND b.is_active = true
      )
    )
    OR public.is_superadmin()
    OR public.is_business_accessible_for_owner(business_id)
  );

-- Público: Crear reseña (siempre entra con is_approved = false)
DROP POLICY IF EXISTS "reviews_insert_public" ON public.reviews;
CREATE POLICY "reviews_insert_public"
  ON public.reviews FOR INSERT
  WITH CHECK (
    is_approved = false AND
    rating >= 1 AND rating <= 5 AND
    char_length(COALESCE(comment, '')) <= 500 AND
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.is_active = true
    )
  );

-- Moderación: Superadmin o el dueño del negocio pueden aprobar o descartar reseñas
DROP POLICY IF EXISTS "reviews_update_owner_or_admin" ON public.reviews;
CREATE POLICY "reviews_update_owner_or_admin"
  ON public.reviews FOR UPDATE
  USING (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  )
  WITH CHECK (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  );

DROP POLICY IF EXISTS "reviews_delete_owner_or_admin" ON public.reviews;
CREATE POLICY "reviews_delete_owner_or_admin"
  ON public.reviews FOR DELETE
  USING (
    public.is_superadmin() OR
    public.is_business_accessible_for_owner(business_id)
  );

-- 5.7 POLICIES: PAYMENTS (Solo Superadmin)
DROP POLICY IF EXISTS "payments_superadmin_all" ON public.payments;
CREATE POLICY "payments_superadmin_all"
  ON public.payments
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());


-- ==============================================================================
-- 6. STORAGE: BUCKET items-media Y POLICIES
-- ==============================================================================
-- Registro idempotente del bucket en storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'items-media',
  'items-media',
  true,
  204800, -- 200 KB exactos
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 204800,
  allowed_mime_types = ARRAY['image/webp']::text[];

-- RLS ya está habilitado por defecto en storage.objects en Supabase (evita error 42501)

-- Lectura pública de imágenes
DROP POLICY IF EXISTS "items_media_public_select" ON storage.objects;
CREATE POLICY "items_media_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'items-media');

-- Inserción: Primer segmento debe ser business_id donde el usuario es owner y el negocio está activo
DROP POLICY IF EXISTS "items_media_owner_insert" ON storage.objects;
CREATE POLICY "items_media_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'items-media' AND
    (
      public.is_superadmin() OR
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.is_active = true
          AND (b.owner_id = auth.uid() OR public.is_business_accessible_for_owner(b.id))
      )
    )
  );

-- Actualización: Solo owner con negocio activo o superadmin
DROP POLICY IF EXISTS "items_media_owner_update" ON storage.objects;
CREATE POLICY "items_media_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'items-media' AND
    (
      public.is_superadmin() OR
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.is_active = true
          AND (b.owner_id = auth.uid() OR public.is_business_accessible_for_owner(b.id))
      )
    )
  );

-- Eliminación: Solo owner o superadmin
DROP POLICY IF EXISTS "items_media_owner_delete" ON storage.objects;
CREATE POLICY "items_media_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'items-media' AND
    (
      public.is_superadmin() OR
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND (b.owner_id = auth.uid() OR public.is_business_accessible_for_owner(b.id))
      )
    )
  );


-- ==============================================================================
-- 7. ÍNDICES DE ALTO RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_parent_id ON public.businesses(parent_id);
CREATE INDEX IF NOT EXISTS idx_businesses_payment_status ON public.businesses(payment_status);
CREATE INDEX IF NOT EXISTS idx_businesses_next_due_date ON public.businesses(next_due_date);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON public.businesses(is_active);

CREATE INDEX IF NOT EXISTS idx_items_business_id ON public.items(business_id);
CREATE INDEX IF NOT EXISTS idx_items_business_status_sort ON public.items(business_id, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_reviews_business_id_approved ON public.reviews(business_id, is_approved);

CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
