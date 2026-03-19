# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build NestJS app
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy built files and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Expose the port your NestJS app listens on
EXPOSE 5000

# Start the app
CMD ["node", "dist/main.js"]