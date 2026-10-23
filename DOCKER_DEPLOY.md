# Guía de Despliegue con Docker en Producción

Este documento detalla la arquitectura del contenedor, los requisitos previos y las opciones de despliegue para **MercadoVirtual**.

---

## 1. Arquitectura del Contenedor Docker

El archivo `Dockerfile` utiliza un patrón **Multi-Stage Build** sobre `node:20-alpine`:

| Etapa | Nombre | Propósito | Salida generada |
|---|---|---|---|
| **Etapa 1** | `deps` | Instalación limpia de dependencias de producción y compilación (`npm ci`) con soporte para librerías nativas (`libc6-compat`). | `/app/node_modules` |
| **Etapa 2** | `builder` | Compilación de Next.js generando salida autónoma optimizada (`output: 'standalone'`). | `/app/.next/standalone` y `/app/.next/static` |
| **Etapa 3** | `runner` | Entorno de ejecución mínimo y seguro sin root ejecutado bajo el usuario `nextjs:nodejs` (UID 1001). | Imagen final lista (~150MB) |

---

## 2. Variables de Entorno Requeridas

Para el entorno de producción, asegúrate de proveer las siguientes variables (por ejemplo, en `.env.production`):

```env
# Variables públicas consumidas por Next.js
NEXT_PUBLIC_SUPABASE_URL=https://<tu-id-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
NEXT_PUBLIC_SITE_URL=https://tudominio.com
NEXT_PUBLIC_CONTACT_WHATSAPP=+59170000000

# Variables del servidor
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key-secreto>
CRON_SECRET=<cadena-secreta-para-endpoints-cron>

# Opcional (por defecto puerto 3000)
PORT=3000
```

---

## 3. Despliegue Rápido con Docker Compose (Recomendado)

1. **Crear o transferir el archivo `.env.production`** con tus credenciales reales al servidor.
2. **Construir y levantar el contenedor en segundo plano**:
   ```bash
   docker compose up -d --build
   ```
3. **Verificar el estado del contenedor**:
   ```bash
   docker compose ps
   ```
4. **Inspeccionar los logs en tiempo real**:
   ```bash
   docker compose logs -f web
   ```
5. **Detener el servicio**:
   ```bash
   docker compose down
   ```

---

## 4. Despliegue Manual con Docker CLI

1. **Construir la imagen de producción**:
   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<tu-id-proyecto>.supabase.co \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key> \
     --build-arg NEXT_PUBLIC_SITE_URL=https://tudominio.com \
     -t mercadovirtual:1.1.0 .
   ```

2. **Ejecutar el contenedor**:
   ```bash
   docker run -d \
     --name mercadovirtual_app \
     --restart always \
     -p 3000:3000 \
     --env-file .env.production \
     mercadovirtual:1.1.0
   ```

---

## 5. Integración Continua (GitHub Actions)

El repositorio incluye el pipeline en `.github/workflows/docker-production.yml` que en cada push a la rama `main`:
1. Valida el tipado estático completo con TypeScript (`npm run typecheck`).
2. Levanta Docker Buildx y compila la imagen para asegurar que el build de producción no tenga fallos ni incompatibilidades de empaquetado.
