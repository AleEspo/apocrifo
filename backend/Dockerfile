FROM node:20-alpine AS builder

WORKDIR /app

# Installa build tools per compilare bcrypt da zero
RUN apk add --no-cache python3 make g++ openssl-dev

COPY package*.json ./
COPY prisma ./prisma/

# Installa dipendenze e forza rebuild di bcrypt
RUN npm ci --legacy-peer-deps
RUN npm rebuild bcrypt --build-from-source

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

# Installa solo runtime dependencies
RUN apk add --no-cache openssl libstdc++

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
