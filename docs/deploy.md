# EditBook 공개·운영 안내

세 가지 방법이 있다. 시험용으로 잠깐 열어 보는 **임시 공개**, 무료로 계속 켜 두는 **Vercel**, 직접 서버를 빌리는 **클라우드 서버 운영**.

## 0. Vercel (무료, 항상 켜져 있음 — 현재 방식)

GitHub 저장소를 Vercel 프로젝트에 연결해 두면 main에 올릴 때마다 자동으로 다시 배포된다. 서버 코드는 Vercel이, 데이터는 Vercel Marketplace의 Neon Postgres(무료 플랜)가 맡는다.

- 빌드 명령은 `vercel.json`의 `npm run build:vercel` = 마이그레이션 적용 → 관리자 계정 보장 → `next build`. 그래서 배포할 때 DB가 함께 최신이 된다.
- 환경변수: `DATABASE_URL`(Neon 연결 시 자동), `ADMIN_PASSWORD`(8자 이상, 예시 값 금지), `ADMIN_LOGIN_ID`(없으면 admin).
- 서울 리전(icn1)에서 실행된다.
- 한계: 로그인 시도 제한이 서버 인스턴스마다 따로 세어지므로 VPS보다 느슨하다. 큰 파일 업로드(2단계)는 Vercel Blob이나 외부 저장소가 필요하다.

## 1. 임시 공개 (이 Mac에서, 몇 시간~며칠 시험용)

```bash
./scripts/share.sh
```

- 운영 빌드 → 서버 시작(포트 3000) → Cloudflare 임시 터널을 열고 `https://….trycloudflare.com` 주소를 출력한다.
- 그 주소를 선생님들께 보내면 바로 접속할 수 있다. 계정은 관리자 화면(`/admin/users`)에서 만들어 준다.
- 주소는 매번 바뀌고, **이 Mac이 켜져 있고 인터넷에 연결된 동안만** 열린다. 덮개를 닫거나 재시작하면 끊긴다.
- 멈추기: `./scripts/share-stop.sh`. 다시 열기(빌드 생략): `./scripts/share.sh --no-build`.
- 상태 파일: `.share/url.txt`(현재 주소), `.share/server.log`, `.share/tunnel.log`.
- 처음 한 번 `brew install cloudflared`가 필요하다(이미 설치됨).

## 2. 클라우드 서버 운영 (계속 쓸 때)

필요한 것: Docker가 설치된 리눅스 서버 한 대(2 vCPU, 2GB RAM, 20GB면 충분), 도메인 하나(선택).

```bash
git clone https://github.com/cleveranawim-source/editbook.git
cd editbook
cp .env.example .env
# .env를 열어 아래 두 값을 아무도 모르는 긴 값으로 바꾼다
#   ADMIN_PASSWORD=...
#   POSTGRES_PASSWORD=...
docker compose -f docker-compose.prod.yml up -d --build
```

- 컨테이너가 시작될 때 DB 마이그레이션을 적용하고 관리자 계정을 보장한다(이미 있으면 건드리지 않음).
- 운영에서는 `ADMIN_PASSWORD`가 예시 값(`change-me-now`)이거나 8자 미만이면 시작을 거부한다.
- 기본 포트 3000. 도메인과 HTTPS를 붙일 때는 Caddy를 앞에 두는 것이 가장 간단하다:

  ```
  editbook.example.com {
      reverse_proxy localhost:3000
  }
  ```

  Caddy가 인증서를 자동으로 받아 준다. 세션 쿠키는 운영에서 HTTPS 전용이므로 HTTPS가 필요하다.
- 업데이트: `git pull && docker compose -f docker-compose.prod.yml up -d --build`
- 백업: `docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres editbook > backup.sql`

## 보안 기본값 (코드에 들어 있음)

- 로그인 실패 제한: 같은 아이디로 15분 안에 10번 틀리면 15분 잠금. 같은 IP로 50번 틀리면 15분 잠금.
- 없는 아이디와 틀린 비밀번호의 응답 시간이 같다(아이디 존재 여부가 새지 않음).
- 로그인 아이디는 소문자로 통일된다.
- 첫 로그인 때 비밀번호 변경을 강제한다.
- 비밀번호는 bcrypt로만 저장, 세션 토큰은 해시로만 저장.

## 아직 안 한 것

- 로그인 제한은 서버 프로세스 메모리에 있다. 서버를 여러 대로 늘리면 DB 테이블로 옮겨야 한다.
- 자동 백업, 모니터링, 알림(PWA 푸시는 4단계).
