# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mousestream -u 1001

# Change ownership
RUN chown -R mousestream:nodejs /app

# Switch to non-root user
USER mousestream

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {if(r.statusCode!==200)throw new Error()})"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
