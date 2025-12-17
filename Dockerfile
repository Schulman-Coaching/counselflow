# CounselFlow Dockerfile
# Simplified production image (pre-built locally)

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ============================================
# Stage 2: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 counselflow

# Copy pre-built application (built locally)
COPY dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json

# Create uploads directory
RUN mkdir -p uploads && chown -R counselflow:nodejs uploads

# Switch to non-root user
USER counselflow

# Expose port
EXPOSE 3001

# Environment variables (set at runtime)
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server
CMD ["node", "dist/server/index.js"]
