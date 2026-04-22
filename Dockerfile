# Production Dockerfile для Next.js 16 с output: 'standalone'
# Используется на Cloud.ru Evolution / Timeweb / Selectel / любом VPS.
# Multi-stage: сборка в deps+builder, запуск — только минимальный runner.

# ---------- 1. Сборка зависимостей ----------
FROM node:20-alpine AS deps
WORKDIR /app
# Alpine не имеет libc — нужно добавить для некоторых native-модулей
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --only=production=false

# ---------- 2. Сборка приложения ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Env-переменные, нужные ТОЛЬКО на этапе билда (публичные),
# прокидываются через --build-arg. Приватные (SUPABASE_SERVICE_ROLE_KEY,
# ANTHROPIC_API_KEY) НЕ нужны на билде — только в runtime.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 3. Runtime-образ (минимальный) ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Непривилегированный пользователь
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone-сборка: server.js + минимальный набор node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Runtime env (SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY) задаются
# в панели Cloud.ru / Timeweb / docker-compose — НЕ в этом файле.
CMD ["node", "server.js"]
