# Stage 1: Builder
FROM node:20.17.0-slim AS builder

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package manager files
COPY package.json pnpm-lock.yaml ./

# Copy application files
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Remove old builds and build the app
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# Stage 2: Runtime
FROM node:20.17.0-slim

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy production files from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./

# Expose port and start the app
EXPOSE 3000
CMD ["pnpm", "start"]
