# EditBook 운영 이미지. 빌드: docker compose -f docker-compose.prod.yml build
FROM node:22-alpine AS deps
WORKDIR /app
# postinstall(prisma generate)이 schema와 prisma.config.ts를 읽으므로 npm ci 전에 복사한다.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN NEXT_OUTPUT=standalone npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S app && adduser -S app -G app
# 앱 본체(standalone)와 정적 파일
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# 마이그레이션·시드 실행에 필요한 것들(prisma CLI, tsx, 소스 경로 별칭용 tsconfig)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts /app/tsconfig.json ./
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/src/generated ./src/generated
COPY scripts/docker-start.sh ./scripts/docker-start.sh
RUN chown -R app:app /app
USER app
EXPOSE 3000
CMD ["sh", "scripts/docker-start.sh"]
