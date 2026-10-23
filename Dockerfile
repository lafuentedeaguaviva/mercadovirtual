# Stage 1: Base & Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar libc6-compat para compatibilidad con ciertas bibliotecas nativas de Node en Alpine
RUN apk add --no-cache libc6-compat

# Copiar manifiestos de paquetes
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desactivar telemetría de Next.js durante el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Argumentos de build para variables públicas que Next.js incrusta durante la compilación
ARG NEXT_PUBLIC_SUPABASE_URL=https://dummy-test-project.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key-build-placeholder
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_CONTACT_WHATSAPP=""

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CONTACT_WHATSAPP=$NEXT_PUBLIC_CONTACT_WHATSAPP

RUN npm run build

# Stage 3: Runner de Producción
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Crear usuario y grupo sin privilegios root por seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos públicos estáticos
COPY --from=builder /app/public ./public

# Configurar permisos para caché de Next.js
RUN mkdir .next && chown nextjs:nodejs .next

# Copiar la salida standalone optimizada y assets estáticos generados
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
