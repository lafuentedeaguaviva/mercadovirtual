# Mapa de Rutas y Enlaces — MercadoVirtual

Este documento contiene todos los enlaces funcionales clickeables tanto para tu entorno local (**http://localhost:3000**) como las referencias a sus archivos de código correspondientes.

---

## 1. Rutas Públicas (Cualquier visitante)

### Página Principal y SEO
| Enlace Local | Archivo Fuente | Descripción |
| :--- | :--- | :--- |
| [http://localhost:3000/](http://localhost:3000/) | [app/page.tsx](file:///d:/mercadovirtual/app/page.tsx) | **Página de Inicio**: Directorio principal de comercios de Oruro, buscador y filtros. |
| [http://localhost:3000/login](http://localhost:3000/login) | [app/login/page.tsx](file:///d:/mercadovirtual/app/login/page.tsx) | **Iniciar Sesión**: Formulario de acceso para comerciantes y administradores. |
| [http://localhost:3000/robots.txt](http://localhost:3000/robots.txt) | [app/robots.ts](file:///d:/mercadovirtual/app/robots.ts) | **Robots SEO**: Reglas para buscadores. |
| [http://localhost:3000/sitemap.xml](http://localhost:3000/sitemap.xml) | [app/sitemap.ts](file:///d:/mercadovirtual/app/sitemap.ts) | **Sitemap XML**: Mapa de URLs dinámico generado para motores de búsqueda. |

---

### Negocios y Catálogos Reales Disponibles (`/[slug]`)
*(Estos enlaces están cargados con catálogo completo, productos, horarios y WhatsApp directo)*

| Enlace Local Directo | Tipo de Negocio / Nicho | Nombre Comercial |
| :--- | :--- | :--- |
| [http://localhost:3000/tecnologia-hogar-oruro](http://localhost:3000/tecnologia-hogar-oruro) | **Comercio / Tienda** (Modo Carrito) | *TecnoHogar Electrodomésticos* (Smart TV, licuadoras, cocina) |
| [http://localhost:3000/plaza-oruro-central](http://localhost:3000/plaza-oruro-central) | **Plaza de Comidas** (Multi-puesto) | *Plaza Gourmet El Minero* (Charquekan, comida típica, pedidos a mesa) |
| [http://localhost:3000/dental-san-agustin](http://localhost:3000/dental-san-agustin) | **Agenda de Citas** (Servicios / Salud) | *Centro Odontológico San Agustín* (Reservas de turnos y consultas) |
| [http://localhost:3000/inmobiliaria-altiplano](http://localhost:3000/inmobiliaria-altiplano) | **Inmobiliaria** (Vitrina de Bienes Raíces) | *Inmobiliaria y Terrenos del Altiplano* (Lotes y departamentos) |
| [http://localhost:3000/mecanica-el-quirquincho](http://localhost:3000/mecanica-el-quirquincho) | **Agenda / Servicios** (Taller) | *Taller Mecánico El Quirquincho* (Diagnóstico y turnos) |
| [http://localhost:3000/cafe-andino-oruro](http://localhost:3000/cafe-andino-oruro) | **Cafetería / Comercio** | *Café Andino de Altura* (Café de especialidad y pastelería) |

---

## 2. Panel de Administración del Negocio (Requiere Iniciar Sesión)

| Enlace Local | Archivo Fuente | Descripción |
| :--- | :--- | :--- |
| [http://localhost:3000/admin](http://localhost:3000/admin) | [app/admin/page.tsx](file:///d:/mercadovirtual/app/admin/page.tsx) | **Dashboard del Comerciante**: Gestión de productos, turnos, perfil y pedidos. *(Si no iniciaste sesión, te enviará a login).* |

---

## 3. Panel de Superadministrador (Requiere Rol `superadmin`)

| Enlace Local | Archivo Fuente | Descripción |
| :--- | :--- | :--- |
| [http://localhost:3000/superadmin](http://localhost:3000/superadmin) | [app/superadmin/page.tsx](file:///d:/mercadovirtual/app/superadmin/page.tsx) | **Métricas Globales**: Resumen de ingresos, negocios activos y volumen transaccional. |
| [http://localhost:3000/superadmin/negocios](http://localhost:3000/superadmin/negocios) | [app/superadmin/negocios/page.tsx](file:///d:/mercadovirtual/app/superadmin/negocios/page.tsx) | **Gestión de Negocios**: Alta, suspensión y control de planes. |
| [http://localhost:3000/superadmin/cobros](http://localhost:3000/superadmin/cobros) | [app/superadmin/cobros/page.tsx](file:///d:/mercadovirtual/app/superadmin/cobros/page.tsx) | **Cobros y Suscripciones**: Registro de cuotas y estados de pago. |

---

## 4. Endpoints Técnicos y APIs

| Enlace / Endpoint | Archivo Fuente | Método | Descripción |
| :--- | :--- | :--- | :--- |
| [http://localhost:3000/auth/callback](http://localhost:3000/auth/callback) | [app/auth/callback/route.ts](file:///d:/mercadovirtual/app/auth/callback/route.ts) | `GET` | Callback de sesión de Supabase Auth. |
| `http://localhost:3000/api/analytics/track` | [app/api/analytics/track/route.ts](file:///d:/mercadovirtual/app/api/analytics/track/route.ts) | `POST` | Registro de eventos y métricas de visitas/WhatsApp. |
| `http://localhost:3000/api/cron/mark-overdue` | [app/api/cron/mark-overdue/route.ts](file:///d:/mercadovirtual/app/api/cron/mark-overdue/route.ts) | `GET` / `POST` | Cron para expirar planes o turnos vencidos. |
