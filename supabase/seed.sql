-- ==============================================================================
-- SEMILLA: seed.sql
-- PROYECTO: Plataforma Phygital Multi-Tenant (Oruro, Bolivia)
-- ==============================================================================
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Crear el usuario Superadmin en auth.users (usar Supabase Studio -> Authentication
--    o mediante la función admin en SQL editor):
--    Ejemplo: email: 'superadmin@mercadovirtual.bo', password: '[CONTRASEÑA_SEGURA]'
-- 2. Asignar el rol 'superadmin' en profiles ejecutando:
--    UPDATE public.profiles SET role = 'superadmin' WHERE id = '<UUID_SUPERADMIN>';
-- 3. Crear los usuarios Owners para cada negocio de prueba en auth.users.
-- 4. Ejecutar el script a continuación reemplazando los placeholders si es necesario,
--    o ejecutándolo directamente ya que utiliza usuarios y UUIDs controlados para pruebas.
-- ==============================================================================

DO $$
DECLARE
  v_superadmin_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_owner_comercio_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  v_owner_plaza_id uuid := '00000000-0000-0000-0000-000000000003'::uuid;
  v_owner_inmueble_id uuid := '00000000-0000-0000-0000-000000000004'::uuid;
  v_owner_agenda_id uuid := '00000000-0000-0000-0000-000000000005'::uuid;

  v_biz_comercio_id uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  v_biz_plaza_id uuid := '10000000-0000-0000-0000-000000000002'::uuid;
  v_biz_puesto1_id uuid := '10000000-0000-0000-0000-000000000003'::uuid;
  v_biz_puesto2_id uuid := '10000000-0000-0000-0000-000000000004'::uuid;
  v_biz_inmueble_id uuid := '10000000-0000-0000-0000-000000000005'::uuid;
  v_biz_agenda_id uuid := '10000000-0000-0000-0000-000000000006'::uuid;
BEGIN

  -- 1. Creación idempotente de usuarios en auth.users (Solo si no existen en entorno local/test)
  -- En producción de Supabase los usuarios se registran via Supabase Auth.
  -- Usamos ON CONFLICT DO NOTHING para preservar integridad.
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES
    (v_superadmin_id, 'admin@mercadovirtual.bo', '{"full_name": "Administrador General"}'::jsonb, 'authenticated', 'authenticated'),
    (v_owner_comercio_id, 'artesanias@mercadovirtual.bo', '{"full_name": "Doña Gregoria Choque"}'::jsonb, 'authenticated', 'authenticated'),
    (v_owner_plaza_id, 'plaza@mercadovirtual.bo', '{"full_name": "Don Marcelo Flores"}'::jsonb, 'authenticated', 'authenticated'),
    (v_owner_inmueble_id, 'bienes@mercadovirtual.bo', '{"full_name": "Lic. Ramiro Zeballos"}'::jsonb, 'authenticated', 'authenticated'),
    (v_owner_agenda_id, 'dental@mercadovirtual.bo', '{"full_name": "Dra. Vania Canaviri"}'::jsonb, 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Asegurar que los perfiles tengan los datos y roles correctos
  INSERT INTO public.profiles (id, full_name, role)
  VALUES
    (v_superadmin_id, 'Administrador General', 'superadmin'),
    (v_owner_comercio_id, 'Doña Gregoria Choque', 'owner'),
    (v_owner_plaza_id, 'Don Marcelo Flores', 'owner'),
    (v_owner_inmueble_id, 'Lic. Ramiro Zeballos', 'owner'),
    (v_owner_agenda_id, 'Dra. Vania Canaviri', 'owner')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  -- 3. Inserción de Negocios
  -- 3.1 Comercio (Tienda de artesanías y máscaras tradicionales de Oruro)
  INSERT INTO public.businesses (
    id, slug, name, niche, catalog_mode, whatsapp,
    address, city, theme, plan_name, max_items, subscription_price,
    payment_status, next_due_date, is_active, owner_id, rating_avg, rating_count, description
  ) VALUES (
    v_biz_comercio_id, 'arte-carnaval-oruro', 'Artesanías y Bordados del Socavón',
    'comercio', 'carrito', '59172456789',
    'Calle La Paz esquina 6 de Octubre, Zona Central', 'Oruro',
    '{"primary_color": "#d97706"}'::jsonb, 'pro', 100, 150.00,
    'al_dia', CURRENT_DATE + INTERVAL '25 days', true, v_owner_comercio_id, 5.00, 1,
    'Máscaras de diablo, bordados folklóricos e indumentaria tradicional del Carnaval de Oruro.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 3.2 Plaza de Comidas (Padre)
  INSERT INTO public.businesses (
    id, slug, name, niche, catalog_mode, whatsapp,
    address, city, theme, plan_name, max_items, subscription_price,
    payment_status, next_due_date, is_active, owner_id, rating_avg, rating_count, description
  ) VALUES (
    v_biz_plaza_id, 'plaza-oruro-central', 'Plaza Gourmet El Minero',
    'plaza_comidas', 'vitrina', '59171812345',
    'Calle Bolívar entre Pagador y Velasco', 'Oruro',
    '{"primary_color": "#b91c1c"}'::jsonb, 'plaza_master', 200, 350.00,
    'al_dia', CURRENT_DATE + INTERVAL '28 days', true, v_owner_plaza_id, 0.00, 0,
    'Espacio gastronómico con los mejores sabores tradicionales y comida rápida en Oruro.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 3.2.1 Puesto 1 de Plaza de Comidas (Hijo con parent_id)
  INSERT INTO public.businesses (
    id, parent_id, slug, name, niche, catalog_mode, whatsapp,
    address, city, theme, plan_name, max_items, subscription_price,
    payment_status, next_due_date, is_active, owner_id, rating_avg, rating_count, description
  ) VALUES (
    v_biz_puesto1_id, v_biz_plaza_id, 'charquekan-dona-pastora', 'Charquekan Doña Pastora',
    'plaza_comidas', 'carrito', '59171812346',
    'Plaza Gourmet El Minero - Local 01', 'Oruro',
    '{"primary_color": "#9a3412"}'::jsonb, 'puesto_plaza', 30, 80.00,
    'al_dia', CURRENT_DATE + INTERVAL '28 days', true, v_owner_plaza_id, 0.00, 0,
    'El tradicional Charquekan orureño con carne desmechada crocante, mote, huevo y queso frito.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 3.2.2 Puesto 2 de Plaza de Comidas (Hijo con parent_id)
  INSERT INTO public.businesses (
    id, parent_id, slug, name, niche, catalog_mode, whatsapp,
    address, city, theme, plan_name, max_items, subscription_price,
    payment_status, next_due_date, is_active, owner_id, rating_avg, rating_count, description
  ) VALUES (
    v_biz_puesto2_id, v_biz_plaza_id, 'api-pasteles-ferroviario', 'Api y Pasteles El Ferroviario',
    'plaza_comidas', 'carrito', '59171812347',
    'Plaza Gourmet El Minero - Local 04', 'Oruro',
    '{"primary_color": "#7c2d12"}'::jsonb, 'puesto_plaza', 30, 80.00,
    'al_dia', CURRENT_DATE + INTERVAL '28 days', true, v_owner_plaza_id, 0.00, 0,
    'Api morado caliente, api blanco y pasteles gigantes con queso fundido.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 3.3 Inmobiliaria
  INSERT INTO public.businesses (
    id, slug, name, niche, catalog_mode, whatsapp,
    address, city, theme, plan_name, max_items, subscription_price,
    payment_status, next_due_date, is_active, owner_id, rating_avg, rating_count, description
  ) VALUES (
    v_biz_inmueble_id, 'inmobiliaria-altiplano', 'Inmobiliaria y Terrenos del Altiplano',
    'inmueble', 'vitrina', '59173899000',
    'Calle Adolfo Mier y Potosí, Edificio El Carmen Of. 2B', 'Oruro',
    '{"primary_color": "#0369a1"}'::jsonb, 'corporativo', 150, 200.00,
    'al_dia', CURRENT_DATE + INTERVAL '15 days', true, v_owner_inmueble_id, 0.00, 0,
    'Venta y alquiler de departamentos céntricos, galpones industriales y lotes en la zona sud y este.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 3.4 Consultorio (Agenda / Citas)
  INSERT INTO public.businesses (
    id, slug, name, niche, catalog_mode, whatsapp,
    address, city, theme, plan_name, max_items, subscription_price,
    payment_status, next_due_date, is_active, owner_id, rating_avg, rating_count, description
  ) VALUES (
    v_biz_agenda_id, 'dental-socavon-oruro', 'Consultorio Dental Socavón',
    'agenda', 'vitrina', '59174112233',
    'Avenida 6 de Agosto esquina Aroma, Galería San Agustín 1er Piso', 'Oruro',
    '{"primary_color": "#0d9488"}'::jsonb, 'profesional', 20, 120.00,
    'al_dia', CURRENT_DATE + INTERVAL '20 days', true, v_owner_agenda_id, 0.00, 0,
    'Especialistas en odontología preventiva, diseño de sonrisa, ortodoncia y extracciones sin dolor.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 4. Inserción de Items (3 items para cada negocio)
  -- 4.1 Items: Comercio
  INSERT INTO public.items (business_id, title, description, price, images, status, sort_order)
  VALUES
    (v_biz_comercio_id, 'Careta de Lucifer Artesanal', 'Máscara modelada en yeso y resina con ojos de vidrio y dragones tallados a mano.', 850.00, ARRAY['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=60'], 'disponible', 1),
    (v_biz_comercio_id, 'Pañuelo Bordado en Hilo de Oro', 'Bordado tradicional de la Fraternidad Artística y Cultural La Diablada.', 280.00, ARRAY['https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=60'], 'disponible', 2),
    (v_biz_comercio_id, 'Botas de Morenada con Cascabeleo', 'Calzado de cuero legítimo con detalles dorados y cascabeles afinados.', 450.00, ARRAY['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=60'], 'disponible', 3)
  ON CONFLICT DO NOTHING;

  -- 4.2 Items: Puesto 1 (Charquekan)
  INSERT INTO public.items (business_id, title, description, price, images, status, sort_order)
  VALUES
    (v_biz_puesto1_id, 'Charquekan Completo Doble Carne', 'Charque de llama crocante, dos porciones de mote blanco pelado, huevo duro, queso criollo frito y llajwa.', 45.00, ARRAY['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=60'], 'disponible', 1),
    (v_biz_puesto1_id, 'Charquekan Mediano Tradicional', 'Porción estándar con carne de res y llama deshidratada con técnica ancestral.', 35.00, ARRAY['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=60'], 'disponible', 2),
    (v_biz_puesto1_id, 'Porción Extra de Queso Frito Challapata', 'Queso criollo de altura dorado en sartén de hierro.', 10.00, ARRAY['https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60'], 'disponible', 3)
  ON CONFLICT DO NOTHING;

  -- 4.3 Items: Puesto 2 (Api y Pasteles)
  INSERT INTO public.items (business_id, title, description, price, images, status, sort_order)
  VALUES
    (v_biz_puesto2_id, 'Vaso Grande de Api Morado', 'Elaborado con maíz morado del valle, canela, clavo de olor y cáscara de naranja caliente.', 8.00, ARRAY['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=60'], 'disponible', 1),
    (v_biz_puesto2_id, 'Pastel Especial Inflado con Queso', 'Pastel frito crujiente inflado, relleno de abundante queso orureño y espolvoreado con azúcar impalpable.', 10.00, ARRAY['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=60'], 'disponible', 2),
    (v_biz_puesto2_id, 'Api Mixto con Buñuelo y Miel de Caña', 'Combinación de api rojo y blanco servido con un buñuelo tradicional.', 15.00, ARRAY['https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=800&auto=format&fit=crop&q=60'], 'disponible', 3)
  ON CONFLICT DO NOTHING;

  -- 4.4 Items: Inmobiliaria
  INSERT INTO public.items (business_id, title, description, price, images, status, sort_order, metadata)
  VALUES
    (v_biz_inmueble_id, 'Departamento Céntrico 3 Dormitorios', 'Piso 4 con ascensor, 120 m2, suite principal, garaje bajo techo y vista panorámica a la ciudad.', 620000.00, ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=60'], 'disponible', 1, '{"superficie_m2": 120, "dormitorios": 3, "banos": 2, "zona": "Central"}'::jsonb),
    (v_biz_inmueble_id, 'Lote Urbanizado Zona Sud', 'Terreno de 300 m2 con todos los servicios básicos instalados (luz, agua, gas domiciliario).', 175000.00, ARRAY['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=60'], 'disponible', 2, '{"superficie_m2": 300, "frente_m": 12, "zona": "Sud - Huajara"}'::jsonb),
    (v_biz_inmueble_id, 'Local Comercial en Alquiler Calle Bolívar', 'Ambiente de 45 m2 ideal para farmacia, sucursal bancaria o tienda de moda.', 3500.00, ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60'], 'disponible', 3, '{"superficie_m2": 45, "modalidad": "Alquiler mensual", "zona": "Comercial"}'::jsonb)
  ON CONFLICT DO NOTHING;

  -- 4.5 Items: Consultorio Odontológico
  INSERT INTO public.items (business_id, title, description, price, images, status, sort_order, metadata)
  VALUES
    (v_biz_agenda_id, 'Consulta y Diagnóstico Integral con Cámara Intraoral', 'Evaluación clínica completa, serie fotográfica y plan de tratamiento personalizado.', 80.00, ARRAY['https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60'], 'disponible', 1, '{"duracion_min": 45}'::jsonb),
    (v_biz_agenda_id, 'Profilaxis y Limpieza Dental con Ultrasonido', 'Eliminación de sarro supragingival, manchas por café y pulido coronario con pasta profiláctica.', 150.00, ARRAY['https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=60'], 'disponible', 2, '{"duracion_min": 60}'::jsonb),
    (v_biz_agenda_id, 'Blanqueamiento Dental LED en Consultorio', 'Sesión intensiva con gel de peróxido al 35% activado por luz azul.', 400.00, ARRAY['https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop&q=60'], 'disponible', 3, '{"duracion_min": 90}'::jsonb)
  ON CONFLICT DO NOTHING;

  -- 5. Reseña de prueba inicial
  INSERT INTO public.reviews (business_id, rating, comment, author_name, is_approved)
  VALUES (
    v_biz_comercio_id, 5,
    'Excelente atención de doña Gregoria, la máscara de diablo llegó impecable para la entrada del carnaval.',
    'Ing. Álvaro Morales', true
  ) ON CONFLICT DO NOTHING;

END $$;
