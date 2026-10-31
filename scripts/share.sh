#!/bin/sh
# 이 Mac에서 돌아가는 EditBook을 인터넷에 임시로 공개한다(Cloudflare 임시 터널).
#   ./scripts/share.sh            빌드 → 운영 서버 시작 → 터널 열기 → 주소 출력
#   ./scripts/share.sh --no-build 지난 빌드 그대로 서버·터널만 다시 시작
# 멈추기: ./scripts/share-stop.sh
# 주의: 터널 주소는 매번 바뀌고, 이 Mac이 켜져 있고 인터넷에 연결된 동안만 열린다.
set -e
cd "$(dirname "$0")/.."
PORT="${PORT:-3000}"
mkdir -p .share

command -v cloudflared >/dev/null 2>&1 || { echo "cloudflared가 없습니다: brew install cloudflared"; exit 1; }
[ -f .env ] || { echo ".env가 없습니다. README를 참고해 만들어 주세요."; exit 1; }

sh scripts/share-stop.sh >/dev/null 2>&1 || true

if [ "$1" != "--no-build" ]; then
  echo "▶ 운영 빌드 중…"
  npm run build >.share/build.log 2>&1 || { echo "빌드 실패. .share/build.log를 보세요."; tail -20 .share/build.log; exit 1; }
fi

echo "▶ 서버 시작(포트 $PORT)…"
# caffeinate -i: 서버가 떠 있는 동안 Mac이 유휴 잠자기에 들어가지 않게 한다(덮개를 닫으면 잔다).
nohup caffeinate -i npx next start -p "$PORT" >.share/server.log 2>&1 &
echo $! >.share/server.pid
for i in $(seq 1 60); do
  curl -sf -o /dev/null "http://localhost:$PORT/login" && break
  sleep 1
done
curl -sf -o /dev/null "http://localhost:$PORT/login" || { echo "서버가 뜨지 않았습니다. .share/server.log를 보세요."; tail -20 .share/server.log; exit 1; }

echo "▶ 터널 여는 중…"
: >.share/tunnel.log
nohup cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate >.share/tunnel.log 2>&1 &
echo $! >.share/tunnel.pid
URL=""
for i in $(seq 1 60); do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' .share/tunnel.log | head -1)
  [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "터널 주소를 얻지 못했습니다. .share/tunnel.log를 보세요."; tail -20 .share/tunnel.log; exit 1; }
echo "$URL" >.share/url.txt
echo
echo "공개 주소: $URL"
echo "(이 주소는 이 Mac이 켜져 있는 동안만 열립니다. 멈추기: ./scripts/share-stop.sh)"
