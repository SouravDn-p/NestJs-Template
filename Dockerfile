FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat python3 make g++

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
  && npm install prisma@6.19.3 --no-save \
  && npx prisma generate
COPY --from=build /app/dist ./dist
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

EXPOSE 5000
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["node", "dist/main.js"]
