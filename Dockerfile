# Multi-stage build for Jitsi Admin Panel

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files and Prisma schema (needed for postinstall's `prisma generate`)
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Replace standalone's pruned node_modules with the full tree from the builder,
# pinned to the version used at build time. The Prisma CLI (needed below by
# docker-entrypoint.sh for `prisma migrate deploy`) has many transitive deps
# (@prisma/config, effect, etc.) that the pruned standalone subset lacks, so
# migrate would fail — or, without a local CLI at all, `npx prisma` would
# download the latest major version, which can be incompatible with the
# generated schema/client.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
RUN rm -rf node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
