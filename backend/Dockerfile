# API de FreeDeli. Se construye desde la raíz del repo: el dominio compartido vive en projects/shared.
#   docker build -f backend/Dockerfile .

FROM node:24-slim AS build
WORKDIR /app
# openssl: Prisma lo usa para elegir el motor de migraciones correcto para Linux.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json backend/
# Sin scripts de instalación, salvo los de Prisma: bajan el motor que usa `migrate deploy`.
RUN cd backend && npm ci --ignore-scripts && npm rebuild prisma @prisma/engines
COPY backend backend
COPY projects/shared/package.json projects/shared/package.json
COPY projects/shared/src/lib/dominio.ts projects/shared/src/lib/dominio.ts
COPY projects/shared/src/lib/models projects/shared/src/lib/models
COPY projects/shared/src/lib/rules projects/shared/src/lib/rules
# generate no se conecta a la base, pero la config exige la variable: alcanza con un valor de relleno.
RUN cd backend && DATABASE_URL=postgresql://x:x@localhost:5432/x npx prisma generate && npx nest build && npm prune --omit=dev

FROM node:24-slim
ENV NODE_ENV=production TZ=America/Argentina/Buenos_Aires
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends tzdata openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/backend/package.json ./
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/prisma.config.ts ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:3000/api/salud').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# Aplica las migraciones pendientes y arranca.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/backend/src/main.js"]
