# Dockerfile for Hisaab Barabar
# Optimized for Google Cloud Run (Node.js 20 on Linux Alpine)

FROM node:20-alpine AS runner

# Create application directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source code and static assets
COPY . .

# Set file permissions for unprivileged node user
RUN chown -R node:node /app

# Run as non-root user for container security
USER node

# Expose port 8080 (Cloud Run injects PORT environment variable)
EXPOSE 8080

# Health check compatible with Docker runtime
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/healthz || exit 1

# Launch the Express server
CMD ["node", "src/server.js"]
