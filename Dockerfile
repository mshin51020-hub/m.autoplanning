FROM node:20-alpine

WORKDIR /app

# Build tools for native npm packages
RUN apk add --no-cache python3 make g++

# VITE_APP_ID must be set at build time (Vite embeds it) AND runtime (JWT verification)
ENV VITE_APP_ID=muscle-plan

# Copy package.json for layer caching
COPY package.json ./

# Install ALL deps (dev + prod) with npm - more reliable than pnpm in Alpine CI
# Explicit --include=dev ensures devDeps (vite, esbuild) are installed
# even if Railway sets NODE_ENV=production during build
RUN npm install --include=dev --legacy-peer-deps

# Copy source files
COPY . .

# Step 1: Build frontend (Vite)
RUN ./node_modules/.bin/vite build

# Step 2: Bundle server (esbuild)
RUN ./node_modules/.bin/esbuild server/_core/index.ts \
    --platform=node --packages=external --bundle --format=esm \
    --outfile=dist/server.js

# Step 3: Bundle migration script (esbuild)
RUN ./node_modules/.bin/esbuild server/migrate.ts \
    --platform=node --packages=external --bundle --format=esm \
    --outfile=dist/migrate.js

# Verify all artifacts exist
RUN ls -la dist/server.js dist/migrate.js dist/public/index.html \
    && echo "=== BUILD SUCCESSFUL ==="

EXPOSE 3000

# Run migrations (non-fatal with ;), then start server
CMD ["sh", "-c", "node dist/migrate.js; NODE_ENV=production node dist/server.js"]
