# Guía de Pruebas Integrales — MercadoVirtual Oruro

Esta guía paso a paso te permite probar cada funcionalidad, nicho y panel de la plataforma desde tu navegador local (**http://localhost:3000**).

---

## 1. Pruebas de Catálogos por Nicho (Experiencia del Cliente)

### A. Nicho Comercio: Carrito de Compras y Pedido por WhatsApp
* **Enlace:** [http://localhost:3000/tecnologia-hogar-oruro](http://localhost:3000/tecnologia-hogar-oruro)
* **Qué probar:**
  1. **Visualización de Productos:** Revisa la lista de electrodomésticos (Smart TV, Freidora, Licuadora) con sus precios en Bolivianos (Bs).
  2. **Contador y Carrito:** Pulsa en el botón `+` para agregar varios productos.
  3. **Barra Flotante del Carrito:** Observa cómo aparece la barra inferior con el total sumado en tiempo real.
  4. **Generación de Mensaje de WhatsApp:** Haz clic en **"Pedir por WhatsApp"**. Se abrirá el enlace a WhatsApp con el mensaje preformateado conteniendo el desglose de productos y el monto final.
  5. **Ficha de Ubicación:** Al pie del catálogo, pulsa en el mapa o botón de cómo llegar.

---

### B. Nicho Plaza de Comidas: Pedido Multi-Puesto y Servicio a Mesa
* **Enlace:** [http://localhost:3000/plaza-oruro-central](http://localhost:3000/plaza-oruro-central)
* **Prueba con Código de Mesa:** [http://localhost:3000/plaza-oruro-central?mesa=4](http://localhost:3000/plaza-oruro-central?mesa=4)
* **Qué probar:**
  1. **Navegación entre Puestos Gastronómicos:** Cambia de pestaña para ver los diferentes puestos de comida dentro del mismo patio.
  2. **Identificador de Mesa:** Observa cómo al abrir el enlace con `?mesa=4`, la interfaz reconoce automáticamente que el comensal está sentado en la mesa 4.
  3. **Pedido con Ubicación de Mesa:** Al presionar en ordenar un plato, el mensaje de WhatsApp incluye automáticamente: `(Mesa #4)` para que el mesero sepa a dónde llevar la comida.

---

### C. Nicho Agenda: Reserva de Citas y Turnos
* **Enlace Salud:** [http://localhost:3000/dental-san-agustin](http://localhost:3000/dental-san-agustin)
* **Enlace Taller Mecánico:** [http://localhost:3000/mecanica-el-quirquincho](http://localhost:3000/mecanica-el-quirquincho)
* **Qué probar:**
  1. **Paso 1 (Selección de Servicio):** Elige un servicio (ej. Limpieza Dental o Escaneo Automotriz) que muestra el precio y tiempo estimado.
  2. **Paso 2 (Calendario y Franjas Horarias):** Pulsa en "Continuar a Horarios", escoge el día de la semana y una de las horas disponibles (ej. 10:00 AM).
  3. **Paso 3 (Datos del Cliente):** Ingresa nombre y teléfono de contacto.
  4. **Confirmación Inmediata:** Al confirmar, se genera el comprobante de turno y el botón para notificar al negocio vía WhatsApp con fecha y hora agendada.

---

### D. Nicho Inmobiliaria: Catálogo Técnico y Geolocalización
* **Enlace:** [http://localhost:3000/inmobiliaria-altiplano](http://localhost:3000/inmobiliaria-altiplano)
* **Qué probar:**
  1. **Ficha Técnica Inmobiliaria:** Revisa los datos técnicos mostrados en cada tarjeta (Superficie en m², dormitorios, baños y cálculo automático de precio por metro cuadrado).
  2. **Filtros por Categoría:** Filtra entre "Departamentos", "Terrenos" o "Locales Comerciales".
  3. **Consulta de Propiedad:** Al pulsar en consultar, el mensaje de WhatsApp adjunta el título del inmueble y su código de referencia.

---

## 2. Prueba del Directorio Principal y Buscador (Home)

* **Enlace:** [http://localhost:3000/](http://localhost:3000/)
* **Qué probar:**
  1. **Buscador en Tiempo Real:** Escribe *"tecnología"*, *"dental"* o *"café"* en la barra de búsqueda y observa el filtrado instantáneo.
  2. **Filtros por Categoría/Nicho:** Haz clic en los botones de filtro rápido (*Gastronomía*, *Servicios*, *Comercio*, *Inmuebles*).
  3. **Tarjetas Phygital:** Cada tarjeta cuenta con acceso directo al catálogo y enlace directo a WhatsApp.

---

## 3. Pruebas de Autenticación y Paneles Administrativos

### A. Pantalla de Inicio de Sesión
* **Enlace:** [http://localhost:3000/login](http://localhost:3000/login)
* **Qué probar:**
  * Interfaz de ingreso con correo y contraseña o Magic Link.
  * Si intentas ingresar directamente a una ruta protegida como [http://localhost:3000/admin](http://localhost:3000/admin) sin sesión, verificarás que el middleware/proxy te redirige a `/login?next=/admin`.

---

### B. Panel de Administración del Negocio (Rol Dueño)
* **Enlace de Registro y Login:** [http://localhost:3000/login](http://localhost:3000/login)
* **Auto-Registro de Nuevo Comerciante (¡Nuevo!):**
  1. En el encabezado superior haz clic en **"+ Registrar Mi Tienda"** o en la pestaña **"Crear Tienda Gratis"** de `/login`.
  2. Llena: Tu nombre, nombre de la tienda, tipo (tienda, comida, citas, inmueble), WhatsApp boliviano y contraseña.
  3. Al registrarte:
     * El sistema crea tu usuario y perfil automáticamente.
     * Crea tu tienda en Oruro con URL única (ej: `/calzados-oruro`) y **15 días de prueba gratis**.
     * Te redirige directo a tu panel **`/admin`** listo para subir productos.
* **Qué probar dentro de `/admin`:**
  1. **Edición del Perfil:** Actualización del nombre comercial, teléfono de WhatsApp, logo, banner y colores de marca.
  2. **Gestión de Catálogo:** Alta de nuevo producto, edición de precio, subida de imágenes (WebP) y cambio de estado (*Disponible / Agotado*).
  3. **Gestión de Turnos (si aplica):** Visualización de la agenda de citas del día.
  4. **Estado de Suscripción:** Indicador del plan activo y fecha de vencimiento.

---

### C. Panel de Superadministrador (Rol `superadmin`)
* **Métricas y Finanzas:** [http://localhost:3000/superadmin](http://localhost:3000/superadmin)
* **Administración de Negocios:** [http://localhost:3000/superadmin/negocios](http://localhost:3000/superadmin/negocios)
* **Historial de Cobros:** [http://localhost:3000/superadmin/cobros](http://localhost:3000/superadmin/cobros)
* **Qué probar (con cuenta superadmin):**
  1. Resumen global de comercios afiliados y métricas del sistema.
  2. Activar, suspender o editar planes de cualquier comercio.
  3. Registro y control de cobros manuales o automáticos de las cuotas de afiliación.

---

## Resumen de la Arquitectura Probada

| Componente | Función Validada |
| :--- | :--- |
| **Next.js 16 + Turbopack** | Server Components de alta velocidad con ISR / SSR. |
| **Proxy / Middleware** | Protección de rutas `/admin/*` y `/superadmin/*`. |
| **Modo Phygital (QR a Mesa)** | Parámetro `?mesa=X` inyectado en pedidos directos a WhatsApp. |
| **Multi-Nicho** | Adaptación automática de la interfaz según el tipo de negocio. |
| **Seguridad de Datos** | RLS en Supabase y validación de tipos inmutables. |
