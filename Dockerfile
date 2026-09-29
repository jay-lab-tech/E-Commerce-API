FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma7.config.ts tsconfig.json ./
COPY src ./src
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce_api npm run db:generate \
    && npm run build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npm run db:deploy && npm start"]
