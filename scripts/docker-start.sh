#!/bin/sh
# 컨테이너 시작: 마이그레이션 적용 → 관리자 계정 보장(이미 있으면 건드리지 않음) → 서버 시작
set -e
npx prisma migrate deploy
npx prisma db seed
exec node server.js
