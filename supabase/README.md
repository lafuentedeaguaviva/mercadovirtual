# Plataforma Phygital Multi-Tenant - Oruro, Bolivia
## Migraciones de Base de Datos y Semilla Supabase

Este directorio contiene las definiciones de infraestructura y esquema de base de datos Postgres para Supabase.

---

### Orden de Ejecución

1. **Migración Inicial (`001_init.sql`)**:
   - Vía Supabase CLI:
     ```bash
     supabase db reset
     # O directamente:
     # supabase migration up
     ```
   - O vía **Supabase Studio (Dashboard Web)**:
     - Ingresa a la sección **SQL Editor**.
     - Copia y pega el contenido completo de [`supabase/migrations/001_init.sql`](file:///d:/mercadovirtual/supabase/migrations/001_init.sql).
     - Presiona **Run**.
     - *Nota*: Puede ejecutarse múltiples veces de forma segura sin provocar errores gracias a su diseño estrictamente **idempotente** (`IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`, `ON CONFLICT`).

2. **Carga de Datos Semilla (`seed.sql`)**:
   - En **SQL Editor**, copia y pega el contenido de [`supabase/seed.sql`](file:///d:/mercadovirtual/supabase/seed.sql) y ejecuta.
   - Crea automáticamente:
     - 1 Superadmin (`admin@mercadovirtual.bo`)
     - 1 Comercio tradicional orureño (`arte-carnaval-oruro`) con 3 items folklóricos
     - 1 Plaza de comidas (`plaza-oruro-central`) con 2 puestos independientes (`charquekan-dona-pastora` y `api-pasteles-ferroviario`), cada uno con 3 items gastronómicos
     - 1 Inmobiliaria (`inmobiliaria-altiplano`) con 3 propiedades
     - 1 Consultorio dental para citas/agenda (`dental-socavon-oruro`) con 3 servicios

---

### Verificación de Criterios de Aceptación

1. **Idempotencia**:
   - Ejecuta `001_init.sql` dos veces consecutivas en el SQL Editor. El script se ejecuta limpiamente con retorno `Success. No rows returned`.

2. **Aislamiento de Negocios Inactivos con `anon key`**:
   ```sql
   -- Como rol anon:
   SET ROLE anon;
   SELECT * FROM public.businesses WHERE is_active = false; -- Retorna 0 filas
   RESET ROLE;
   ```

3. **Restricción de Modificación a Owners**:
   ```sql
   -- Simular llamada de owner modificando payment_status o max_items:
   -- El trigger `tr_protect_business_restricted_fields` aborta con EXCEPTION.
   ```

4. **Límite de Items por Negocio (`max_items`)**:
   - El trigger `check_item_limit_before_insert` calcula `COUNT(*)` previo a insertar. Si el total actual `>= max_items`, arroja excepción bloqueando la inserción.

5. **RPC `register_payment` Restringida**:
   - Valida `is_superadmin()`. Si es ejecutada por un `owner` o `anon`, falla con:
     `'Acceso denegado: Solo el superadmin puede registrar pagos.'`
