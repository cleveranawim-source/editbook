#!/bin/sh
# Vercel 빌드: DB가 연결되어 있으면 마이그레이션·관리자 시드를 먼저 적용하고, 없으면 건너뛰고 빌드만 한다.
set -e
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL이 없어 마이그레이션·시드를 건너뜁니다. Vercel 프로젝트의 Storage에서 Neon을 연결한 뒤 다시 배포하세요."
else
  npx prisma migrate deploy
  npx prisma db seed
fi
npx next build
