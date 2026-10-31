# EditBook

교사 집필진과 편집장이 교과서 원고를 함께 다듬는 웹 편집실입니다. 현재는 1단계 뼈대(계정·책·참여자·파트 관리)까지 구현되어 있습니다.

## 요구 사항

- Node 26
- Docker (개발용 PostgreSQL)

## 로컬 실행

```bash
cp .env.example .env
npm install
npm run db:up
npx prisma migrate dev
npx prisma db seed
npm run dev
```

http://localhost:3000 에서 `admin` / `.env`의 `ADMIN_PASSWORD`로 로그인합니다. 첫 로그인 때 비밀번호를 바꿔야 합니다.

## 테스트

```bash
npm run test
```

DB 컨테이너(`npm run db:up`)가 떠 있어야 하며, 별도의 `editbook_test` DB를 사용합니다.

## 역할

- 관리자: 계정과 책을 만들고 책마다 편집장을 지정합니다.
- 편집장: 담당 책의 참여자(교사)와 파트를 관리합니다.
- 교사: 참여 중인 책의 파트 목록을 보고 자기 파트를 확인합니다.

## 화면

- `/login` 로그인
- `/books` 책 목록
- `/books/[id]` 파트 목록
- `/books/[id]/manage` 참여자·파트 관리 (편집장)
- `/admin/users` 계정 관리 (관리자)
- `/admin/books` 책 관리 (관리자)

## 설계 문서

[docs/superpowers/specs/2026-10-30-editbook-design.md](docs/superpowers/specs/2026-10-30-editbook-design.md)

## 다른 사람이 접속하게 하기

- 임시 공개(이 Mac에서): `./scripts/share.sh` → 출력된 `https://….trycloudflare.com` 주소를 공유. 멈추기 `./scripts/share-stop.sh`.
- 계속 쓰는 서버: [docs/deploy.md](docs/deploy.md).
