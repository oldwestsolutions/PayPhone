FROM node:20-alpine

WORKDIR /app

# Monorepo workspace install
COPY package.json package-lock.json ./
COPY packages/payment-layer/package.json packages/payment-layer/
COPY apps/gateway/package.json apps/gateway/

RUN npm ci --workspace=@payphone/gateway --include-workspace-root

COPY packages/payment-layer packages/payment-layer
COPY apps/gateway apps/gateway

ENV NODE_ENV=production
EXPOSE 4000

WORKDIR /app/apps/gateway
CMD ["node", "src/server.js"]
