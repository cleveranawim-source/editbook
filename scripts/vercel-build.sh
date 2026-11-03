#!/bin/sh
# Vercel 빌드: DB가 연결되어 있으면 마이그레이션·관리자 시드를 먼저 적용하고, 없으면 건너뛰고 빌드만 한다.
set -e
echo "== EditBook 빌드 환경 점검 =="
for k in DATABASE_URL DATABASE_URL_UNPOOLED ADMIN_LOGIN_ID ADMIN_PASSWORD; do
  if eval "[ -n \"\${$k:-}\" ]"; then echo "  $k: 있음"; else echo "  $k: 없음"; fi
done
echo "  node: $(node -v), npm: $(npm -v)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL이 없어 마이그레이션·시드를 건너뜁니다. Vercel 프로젝트의 Storage에서 Neon을 연결한 뒤 다시 배포하세요."
else
  echo "== 마이그레이션 적용 =="
  npx prisma migrate deploy
  if [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo "ADMIN_PASSWORD가 없어 관리자 계정 생성을 건너뜁니다. Settings → Environment Variables에 넣고 다시 배포하세요."
  else
    echo "== 관리자 계정 보장 =="
    npx prisma db seed
  fi
fi
echo "== next build =="
npx next build
