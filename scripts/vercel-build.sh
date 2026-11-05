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
  # 실행 중인 서버가 연결을 잡고 있으면 "too many connections"로 실패할 수 있어 몇 번 기다렸다 다시 시도한다.
  ok=0
  for try in 1 2 3 4 5; do
    if npx prisma migrate deploy; then ok=1; break; fi
    echo "마이그레이션 실패(${try}/5). 20초 뒤 다시 시도합니다."
    sleep 20
  done
  [ "$ok" = 1 ] || { echo "마이그레이션을 적용하지 못했습니다."; exit 1; }
  if [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo "ADMIN_PASSWORD가 없어 관리자 계정 생성을 건너뜁니다. Settings → Environment Variables에 넣고 다시 배포하세요."
  else
    echo "== 관리자 계정 보장 =="
    npx prisma db seed
  fi
fi
echo "== 브라우저용 외부 파일 복사(pdf.js 워커, rhwp wasm) =="
node scripts/copy-vendor.mjs
echo "== next build =="
npx next build
