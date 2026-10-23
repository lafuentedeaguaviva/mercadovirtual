# Registro de Cambios (Changelog) - MercadoVirtual

Todas las modificaciones notables y lanzamientos de este proyecto están documentados en este archivo siguiendo el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado semántico [SemVer](https://semver.org/).

---

## [1.1.0] - 2026-10-23

### Agregado
- **Contenedor Docker para Producción**:
  - `Dockerfile` multi-etapa (`deps`, `builder`, `runner`) optimizado con base `node:20-alpine`.
  - Integración de usuario del sistema sin privilegios root (`nextjs:nodejs`, UID 1001) para endurecimiento de seguridad.
  - Generación de build autónomo `standalone` con empaquetado mínimo de dependencias y assets estáticos.
- **Docker Compose**:
  - `docker-compose.yml` para orquestación y despliegue rápido con reinicio automático (`restart: always`), mapeo del puerto 3000 y configuración de variables de entorno de producción.
- **Exclusión de Archivos en Docker**:
  - `.dockerignore` configurado para impedir la inclusión innecesaria de `.git`, `node_modules`, `.next`, secretos `.env*` y artefactos de desarrollo en la imagen.
- **Integración y Despliegue Continuo (CI/CD)**:
  - Workflow de GitHub Actions en `.github/workflows/docker-production.yml` para validación estricta de TypeScript (`typecheck`) y compilación automática de la imagen Docker en cada push a la rama `main`.
- **Documentación de Despliegue y Arquitectura de Contenedores**:
  - Guía completa de despliegue con Docker en `DOCKER_DEPLOY.md`.

### Modificado
- **`next.config.ts`**: Activada la opción `output: "standalone"` requerida por el runner de Docker de Next.js.
- **`package.json`**: Actualizada la versión del proyecto a `1.1.0`.

---

## [1.0.0] - 2026-10-23

### Agregado
- **Núcleo de Marketplace Fígital (MercadoVirtual)**:
  - Soporte completo para 5 nichos de negocio:
    - *Plaza de Comidas / Restaurantes* (puestos de comida rápida, combos, extras, cálculo de pedido por WhatsApp).
    - *Inmuebles / Lotes* (terrenos, superficie m², servicios básicos, precio por m² y enlace directo a Google Maps).
    - *Comercio / Tienda* (stock, variantes, precios con descuento).
    - *Servicios / Agenda* (reserva de turnos y franjas horarias).
    - *Vitrina / Catálogo* (modo exhibición de productos destacados).
- **Directorio Principal**:
  - Búsqueda en tiempo real por término, filtrado por nicho, vista de tarjetas y mapa interactivo con Leaflet.
- **Panel de Administración para Propietarios (`/admin`)**:
  - Creación, edición y eliminación de ítems con validación Zod.
  - Optimización y compresión del lado del cliente para subida de imágenes.
  - Personalización de branding, paleta de colores y enlaces sociales/WhatsApp.
  - Métricas de visitas y clics de contacto con gráficos y tasa de conversión.
- **Panel de Superadministrador (`/superadmin`)**:
  - Gestión centralizada de comercios afiliados y control de suscripciones/cobros.
  - Generador de códigos QR vectoriales para los locales fígitales.
- **Seguridad y Persistencia (Supabase)**:
  - Esquema relacional SQL completo con Row Level Security (RLS) habilitado.
  - Autenticación segura y rate limiting a nivel de base de datos para reseñas y métricas.
