#!/bin/sh
# share.sh로 띄운 서버와 터널을 멈춘다.
cd "$(dirname "$0")/.."
for f in tunnel server; do
  if [ -f ".share/$f.pid" ]; then
    pid=$(cat ".share/$f.pid")
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    rm -f ".share/$f.pid"
  fi
done
# next start는 caffeinate 아래 npx 아래에서 돌아가므로 포트 기준으로 한 번 더 정리한다.
PORT="${PORT:-3000}"
pids=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
[ -n "$pids" ] && kill $pids 2>/dev/null || true
rm -f .share/url.txt
echo "멈췄습니다."
