# Stage 1: 依赖安装和应用构建
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS builder

RUN npm config set registry https://registry.npmmirror.com
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NEXT_SWC=0 \
    NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
# 安装所有依赖（包括开发依赖）用于构建
RUN npm ci --legacy-peer-deps
COPY src ./src
COPY public ./public
COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY components.json ./
RUN npm run build

# Stage 2: 生产环境运行
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache bind-tools
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]