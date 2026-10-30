# EditBook 1단계(뼈대) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인, 관리자 계정·책·참여자 관리, 편집장의 파트 관리, 책 목록·파트 목록 화면까지 동작하는 EditBook 뼈대를 만든다. (설계서 7절 1단계)

**Architecture:** Next.js App Router 단일 앱. 화면은 서버 컴포넌트, 변경은 Server Action이 `src/lib/*`의 데이터 함수를 호출한다. 권한 판단과 상태 계산은 DB 없이 동작하는 순수 함수로 분리해 단위 테스트하고, 데이터 함수는 Docker의 테스트용 PostgreSQL에 붙어 통합 테스트한다. 인증은 자체 세션 테이블 + httpOnly 쿠키이며 미들웨어 없이 페이지·액션 안에서 `requireUser()`로 지킨다.

**Tech Stack:** Node 26, npm, Next.js(최신 안정판, App Router, `src/` 디렉터리, TypeScript), Tailwind CSS, Prisma(최신, `@prisma/adapter-pg` + `pg`), PostgreSQL 16(Docker), bcryptjs, Vitest, dotenv-cli.

**Spec:** `docs/superpowers/specs/2026-10-30-editbook-design.md`

## Global Constraints

- UI 문구는 모두 한국어. 상태 색은 빨강(내 차례)·노랑(상대 차례)·초록(완료)·회색(대기) 네 가지만.
- 역할은 세 가지: 관리자(`User.isAdmin`), 책별 `EDITOR`(편집장), 책별 `AUTHOR`(교사).
- 계정은 관리자가 만들고 첫 로그인 시 비밀번호를 바꾸게 한다(`mustChangePassword`). 이메일·외부 로그인 없음.
- 담당자와 편집장만 파트를 변경한다. 같은 책 참여자는 읽기만.
- 휴대폰 화면(360px 너비)에서 가로 스크롤 없이 쓸 수 있어야 한다.
- 세션 쿠키 이름 `eb_session`, 유효기간 30일, httpOnly, sameSite=lax.
- 비밀번호 최소 8자.
- 이 단계에서는 원고·요청이 없으므로 모든 파트 상태는 `원고 없음`이지만, 상태 계산 함수는 설계서 4절의 다섯 상태를 모두 구현한다.

## Review Focus

1. 보관된 책(`ARCHIVED`)은 목록 아래 흐리게 보이고, 편집장이라도 파트·참여자를 바꿀 수 없어야 한다. → Task 8, 9 테스트.
2. 같은 `loginId`로 두 번 계정을 만들면 두 번째는 명확한 한국어 오류로 거절되어야 한다. → Task 7 테스트.
3. 세션 쿠키가 만료되었거나 DB에서 지워진 뒤 요청하면 로그인 화면으로 보내야 하고, 500이 나면 안 된다. → Task 3, 4 테스트.
4. 책 참여자가 아닌 사용자가 `/books/[id]` 주소를 직접 치면 404가 나야 한다(존재 여부를 알려주지 않음). → Task 10 테스트.
5. 파트 순서 바꾸기에 그 책에 속하지 않은 파트 id가 섞여 들어오면 전체를 거부해야 한다. → Task 9 테스트.

---

## 파일 구조

```
docker-compose.dev.yml            개발·테스트용 PostgreSQL 2개(editbook, editbook_test)
.env.example / .env.test
prisma/schema.prisma, prisma.config.ts, prisma/migrations/
prisma/seed.ts                    첫 관리자 계정 생성
src/lib/db.ts                     PrismaClient 싱글턴
src/lib/auth/password.ts          hashPassword / verifyPassword
src/lib/auth/session.ts           세션 생성·조회·삭제 (DB)
src/lib/auth/current.ts           쿠키 → 현재 사용자, requireUser / requireAdmin
src/lib/permissions.ts            순수 권한 함수
src/lib/part-status.ts            순수 파트 상태 계산
src/lib/users.ts                  계정 생성·목록·비밀번호 초기화·변경
src/lib/books.ts                  책 생성·보관·참여자·목록
src/lib/parts.ts                  파트 생성·수정·순서
src/lib/errors.ts                 AppError (한국어 메시지)
src/app/layout.tsx, globals.css   상단바(앱 이름, 사용자 이름, 로그아웃)
src/app/login/page.tsx, actions.ts
src/app/change-password/page.tsx, actions.ts
src/app/books/page.tsx            책 목록
src/app/books/[bookId]/page.tsx   파트 목록
src/app/books/[bookId]/manage/page.tsx, actions.ts   편집장: 참여자·파트 관리
src/app/admin/users/page.tsx, actions.ts
src/app/admin/books/page.tsx, actions.ts
src/components/StatusBadge.tsx, BookCard.tsx, PartRow.tsx
tests/helpers/db.ts               resetDb(), 테스트용 픽스처
tests/unit/*.test.ts, tests/integration/*.test.ts
```

---

### Task 1: 프로젝트 뼈대와 테스트 환경

**Files:**
- Create: `package.json`(create-next-app 생성), `docker-compose.dev.yml`, `.env.example`, `.env.test`, `vitest.config.ts`, `tests/unit/smoke.test.ts`
- Modify: `.gitignore`(이미 있음, 유지)

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run test`(= `dotenv -e .env.test -- vitest run`), `npm run db:up`(= `docker compose -f docker-compose.dev.yml up -d`).

- [ ] **Step 1: Next.js 생성**

Run (저장소 루트에서, 기존 `docs/`·`.git` 유지):
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```
기존 파일 충돌 질문이 나오면 유지한다. `src/app/page.tsx`의 기본 내용은 지우고 `/books`로 redirect하는 한 줄로 바꾼다.

- [ ] **Step 2: 테스트 도구와 DB 설치**

```bash
npm i -D vitest dotenv-cli @types/node
```
`vitest.config.ts`: `test.include = ['tests/**/*.test.ts']`, `test.environment = 'node'`, `resolve.alias['@'] = './src'`.

`docker-compose.dev.yml`: `postgres:16` 컨테이너 1개, 포트 5432, `POSTGRES_PASSWORD=editbook`, 초기화 스크립트로 `editbook`, `editbook_test` 두 DB 생성(`docker-entrypoint-initdb.d`에 SQL 한 줄).

`.env.example`: `DATABASE_URL=postgresql://postgres:editbook@localhost:5432/editbook`, `ADMIN_LOGIN_ID=admin`, `ADMIN_PASSWORD=change-me-now`.
`.env.test`: 같은 형식, DB 이름만 `editbook_test`.

- [ ] **Step 3: 스모크 테스트 작성**

`tests/unit/smoke.test.ts`:
```ts
import { test, expect } from 'vitest'
test('vitest runs', () => { expect(1 + 1).toBe(2) })
```

- [ ] **Step 4: 실행 확인**

Run: `npm run db:up && npm run test`
Expected: 1 passed. `npm run build` Expected: 오류 없이 완료.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: Next.js 뼈대, Vitest, 개발용 PostgreSQL"
```

---

### Task 2: Prisma 스키마와 테스트 DB 헬퍼

**Files:**
- Create: `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts`, `tests/helpers/db.ts`, `tests/integration/schema.test.ts`

**Interfaces:**
- Produces: `prisma` (PrismaClient 싱글턴, `src/lib/db.ts`), `resetDb(): Promise<void>` (모든 테이블 TRUNCATE), 모델 `User, Session, Book, BookMember, Part`.

- [ ] **Step 1: Prisma 설치·초기화**

```bash
npm i @prisma/client @prisma/adapter-pg pg && npm i -D prisma @types/pg && npx prisma init
```

- [ ] **Step 2: 스키마 작성** (`prisma/schema.prisma`)

```prisma
model User {
  id                 String   @id @default(cuid())
  loginId            String   @unique
  name               String
  passwordHash       String
  isAdmin            Boolean  @default(false)
  mustChangePassword Boolean  @default(true)
  createdAt          DateTime @default(now())
  sessions           Session[]
  memberships        BookMember[]
  assignedParts      Part[]
}
model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
enum BookStatus { ACTIVE ARCHIVED }
enum BookRole { EDITOR AUTHOR }
model Book {
  id        String     @id @default(cuid())
  title     String
  status    BookStatus @default(ACTIVE)
  createdAt DateTime   @default(now())
  members   BookMember[]
  parts     Part[]
}
model BookMember {
  bookId String
  userId String
  role   BookRole
  book   Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([bookId, userId])
}
model Part {
  id             String  @id @default(cuid())
  bookId         String
  order          Int
  title          String
  note           String  @default("")
  assigneeUserId String?
  book           Book  @relation(fields: [bookId], references: [id], onDelete: Cascade)
  assignee       User? @relation(fields: [assigneeUserId], references: [id], onDelete: SetNull)
  @@unique([bookId, order])
}
```

`src/lib/db.ts`: `PrismaPg({ connectionString: process.env.DATABASE_URL })` 어댑터로 만든 `PrismaClient`를 `globalThis`에 캐시해 export.

- [ ] **Step 3: 마이그레이션**

Run: `npx prisma migrate dev --name init` 그리고 `npx dotenv -e .env.test -- prisma migrate deploy`
`package.json`의 `test` 스크립트를 `dotenv -e .env.test -- sh -c "prisma migrate deploy && vitest run"`으로 바꾼다.

- [ ] **Step 4: 테스트 헬퍼와 스키마 테스트**

`tests/helpers/db.ts`: `resetDb()`는 `TRUNCATE "Part","BookMember","Book","Session","User" CASCADE`. 
`tests/integration/schema.test.ts`:
```ts
test('part order is unique within a book', async () => {
  await resetDb()
  const book = await prisma.book.create({ data: { title: '종교 1' } })
  await prisma.part.create({ data: { bookId: book.id, order: 1, title: '1단원' } })
  await expect(prisma.part.create({ data: { bookId: book.id, order: 1, title: '중복' } })).rejects.toThrow()
})
```

- [ ] **Step 5: 실행** Run: `npm run test` Expected: PASS.
- [ ] **Step 6: Commit** `git commit -m "feat: Prisma 스키마(User, Session, Book, BookMember, Part)"`

---

### Task 3: 비밀번호와 세션

**Files:**
- Create: `src/lib/auth/password.ts`, `src/lib/auth/session.ts`, `src/lib/errors.ts`, `tests/unit/password.test.ts`, `tests/integration/session.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>` (bcryptjs, cost 10)
  - `createSession(userId: string): Promise<{ token: string; expiresAt: Date }>` — token은 32바이트 랜덤 hex, DB에는 sha256 hex 저장, 만료 30일
  - `getUserBySessionToken(token: string): Promise<User | null>` — 만료·미존재면 null
  - `deleteSession(token: string): Promise<void>`
  - `SESSION_COOKIE = 'eb_session'`, `SESSION_DAYS = 30`
  - `class AppError extends Error { constructor(message: string) }` — 사용자에게 보여줄 한국어 메시지 전용

- [ ] **Step 1: 테스트 작성**

`tests/unit/password.test.ts`:
```ts
test('hash verifies and rejects wrong password', async () => {
  const h = await hashPassword('secret123')
  expect(await verifyPassword('secret123', h)).toBe(true)
  expect(await verifyPassword('wrong', h)).toBe(false)
})
```
`tests/integration/session.test.ts`:
```ts
test('session round trip', async () => { /* user 생성 → createSession → getUserBySessionToken(token)?.id === user.id */ })
test('expired session returns null', async () => { /* createSession 후 expiresAt을 과거로 update → null */ })
test('unknown token returns null', async () => { expect(await getUserBySessionToken('nope')).toBeNull() })
test('deleteSession invalidates', async () => { /* delete 후 null */ })
```

- [ ] **Step 2: 실패 확인** Run: `npm run test` Expected: FAIL (모듈 없음).
- [ ] **Step 3: 구현** `npm i bcryptjs && npm i -D @types/bcryptjs`. 위 시그니처대로 구현.
- [ ] **Step 4: 통과 확인** Run: `npm run test` Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: 비밀번호 해시와 세션"`

---

### Task 4: 로그인·로그아웃·비밀번호 변경 화면

**Files:**
- Create: `src/lib/auth/current.ts`, `src/lib/users.ts`(일부), `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/change-password/page.tsx`, `src/app/change-password/actions.ts`, `src/app/layout.tsx`(수정), `tests/integration/users.test.ts`
- Modify: `src/app/page.tsx` → `/books`로 redirect

**Interfaces:**
- Produces:
  - `getCurrentUser(): Promise<User | null>` — `cookies()`에서 `eb_session` 읽어 `getUserBySessionToken`
  - `requireUser(): Promise<User>` — 없으면 `redirect('/login')`; `mustChangePassword`면 `redirect('/change-password')` (단, 현재 경로가 그 페이지면 제외)
  - `requireAdmin(): Promise<User>` — `requireUser` 후 `isAdmin` 아니면 `notFound()`
  - `authenticate(loginId: string, password: string): Promise<User>` — 실패 시 `AppError('아이디 또는 비밀번호가 맞지 않습니다.')` (`src/lib/users.ts`)
  - `changePassword(userId: string, newPassword: string): Promise<void>` — 8자 미만이면 `AppError('비밀번호는 8자 이상이어야 합니다.')`, 성공 시 `mustChangePassword=false`, 그 사용자의 다른 세션 모두 삭제
  - Server Actions: `loginAction(prev, formData)`, `logoutAction()`, `changePasswordAction(prev, formData)` — `useActionState` 형식, 반환 `{ error?: string }`

- [ ] **Step 1: 테스트 작성** (`tests/integration/users.test.ts`)
```ts
test('authenticate ok / wrong password / unknown id', ...)   // 세 경우
test('changePassword enforces min length and clears mustChangePassword', ...)
test('changePassword deletes other sessions', ...)
```
- [ ] **Step 2: 실패 확인** Run: `npm run test` Expected: FAIL.
- [ ] **Step 3: 구현** lib 함수, `current.ts`, 페이지 2개와 액션. 로그인 성공 시 `cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: NODE_ENV==='production', expires })` 후 `/books`로 redirect. 레이아웃 상단바: 앱 이름 "EditBook", 로그인 상태면 사용자 이름 + 로그아웃 버튼(폼).
- [ ] **Step 4: 통과·수동 확인** Run: `npm run test` PASS. `npm run dev` 후 `/books` 접속 → `/login`으로 이동하는지 확인.
- [ ] **Step 5: Commit** `git commit -m "feat: 로그인, 로그아웃, 비밀번호 변경"`

---

### Task 5: 관리자 시드

**Files:**
- Create: `prisma/seed.ts`, `tests/integration/seed.test.ts`
- Modify: `package.json` (`"prisma": { "seed": "npx tsx prisma/seed.ts" }`, `npm i -D tsx`), `prisma.config.ts`(Prisma 7이면 `migrations.seed` 설정)

**Interfaces:**
- Produces: `ensureAdmin(loginId: string, password: string): Promise<User>` (`src/lib/users.ts`) — 있으면 그대로 반환(비밀번호 안 바꿈), 없으면 `isAdmin=true, mustChangePassword=true`로 생성. `seed.ts`는 env `ADMIN_LOGIN_ID`, `ADMIN_PASSWORD`로 호출.

- [ ] **Step 1: 테스트** `ensureAdmin` 두 번 호출해도 1명, 두 번째 호출이 비밀번호를 덮어쓰지 않음.
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4: 통과** Run `npm run test`; 그리고 `npx prisma db seed` 후 `npm run dev`에서 admin으로 로그인 → 비밀번호 변경 화면으로 가는지 확인.
- [ ] **Step 5: Commit** `git commit -m "feat: 첫 관리자 시드"`

---

### Task 6: 순수 권한 함수와 파트 상태 계산

**Files:**
- Create: `src/lib/permissions.ts`, `src/lib/part-status.ts`, `tests/unit/permissions.test.ts`, `tests/unit/part-status.test.ts`

**Interfaces:**
- Produces (`permissions.ts`, DB 접근 없음):
  - `type Actor = { id: string; isAdmin: boolean }`
  - `canViewBook(actor: Actor, role: BookRole | null): boolean` — admin 또는 role 있음
  - `canManageBook(actor: Actor, role: BookRole | null, bookStatus: BookStatus): boolean` — `ACTIVE`이고 (admin 또는 EDITOR)
  - `canEditPart(actor: Actor, role: BookRole | null, bookStatus: BookStatus, part: { assigneeUserId: string | null }): boolean` — `ACTIVE`이고 (EDITOR 또는 `assigneeUserId === actor.id`). 관리자는 포함하지 않음.
- Produces (`part-status.ts`):
  - `type PartStatusInput = { hasVersion: boolean; openRequests: number; awaitingReview: number; completed: boolean }`
  - `type PartStatus = { kind: 'NO_MANUSCRIPT' | 'EDITOR_REVIEW' | 'REQUESTS' | 'AWAITING' | 'DONE'; count: number; label: string; tone: 'red' | 'yellow' | 'green' | 'gray' }`
  - `computePartStatus(i: PartStatusInput): PartStatus` — 우선순위: `!hasVersion`→NO_MANUSCRIPT(gray,"원고 없음"); `completed`→DONE(green,"완료"); `openRequests>0`→REQUESTS(red,`요청 ${n}`); `awaitingReview>0`→AWAITING(yellow,`확인 대기 ${n}`); 그 외→EDITOR_REVIEW(yellow,"편집장 검토 중")

- [ ] **Step 1: 테스트** 각 함수의 모든 분기 1개씩 (권한 7개, 상태 5개 + 요청과 확인대기가 둘 다 있으면 REQUESTS).
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4: 통과** Run `npm run test`.
- [ ] **Step 5: Commit** `git commit -m "feat: 권한 판단과 파트 상태 계산"`

---

### Task 7: 관리자 — 계정 관리

**Files:**
- Modify: `src/lib/users.ts`
- Create: `src/app/admin/users/page.tsx`, `src/app/admin/users/actions.ts`, `tests/integration/users-admin.test.ts`

**Interfaces:**
- Produces:
  - `createUser(input: { loginId: string; name: string; password: string; isAdmin?: boolean }): Promise<User>` — 중복 `loginId`면 `AppError('이미 있는 아이디입니다.')`, 빈 값·8자 미만이면 AppError. `mustChangePassword=true`.
  - `resetPassword(userId: string, newPassword: string): Promise<void>` — `mustChangePassword=true`, 모든 세션 삭제.
  - `listUsers(): Promise<User[]>` — 이름순.
  - Actions: `createUserAction`, `resetPasswordAction` (각각 `requireAdmin()` 후 호출, `revalidatePath('/admin/users')`).

- [ ] **Step 1: 테스트** 생성 성공, 중복 아이디 거절(메시지 일치), 초기화 후 세션 전부 삭제·`mustChangePassword` true.
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** 페이지: 계정 목록 표(아이디, 이름, 관리자 여부, 첫 로그인 전 표시) + "계정 만들기" 폼 + 행마다 "비밀번호 초기화" 폼(새 비밀번호 입력). → **Step 4: 통과·수동 확인**.
- [ ] **Step 5: Commit** `git commit -m "feat: 관리자 계정 관리"`

---

### Task 8: 관리자 — 책 만들기·보관·편집장 지정

**Files:**
- Create: `src/lib/books.ts`, `src/app/admin/books/page.tsx`, `src/app/admin/books/actions.ts`, `tests/integration/books.test.ts`

**Interfaces:**
- Produces (`books.ts`):
  - `createBook(input: { title: string; editorUserId: string }): Promise<Book>` — 제목 비면 AppError; 편집장을 `EDITOR` 멤버로 추가.
  - `setBookStatus(bookId: string, status: BookStatus): Promise<void>`
  - `addMember(bookId: string, userId: string, role: BookRole): Promise<void>` — 책이 `ARCHIVED`면 `AppError('보관된 책은 바꿀 수 없습니다.')`; 이미 있으면 역할만 갱신.
  - `removeMember(bookId: string, userId: string): Promise<void>` — 마지막 편집장이면 `AppError('편집장은 한 명 이상 있어야 합니다.')`
  - `getRole(bookId: string, userId: string): Promise<BookRole | null>`
  - `listAllBooks(): Promise<(Book & { members: (BookMember & { user: User })[] })[]>`

- [ ] **Step 1: 테스트** 생성 시 편집장 멤버 생김, 보관된 책에 addMember 거절, 마지막 편집장 제거 거절, getRole.
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** 페이지: 책 목록(제목, 상태, 편집장 이름들) + "책 만들기" 폼(제목, 편집장 선택) + "보관/복원" 버튼. → **Step 4: 통과**.
- [ ] **Step 5: Commit** `git commit -m "feat: 관리자 책 관리"`

---

### Task 9: 편집장 — 참여자와 파트 관리

**Files:**
- Create: `src/lib/parts.ts`, `src/app/books/[bookId]/manage/page.tsx`, `src/app/books/[bookId]/manage/actions.ts`, `tests/integration/parts.test.ts`

**Interfaces:**
- Consumes: `canManageBook`, `addMember/removeMember/getRole`.
- Produces (`parts.ts`):
  - `createPart(input: { bookId: string; title: string; assigneeUserId?: string | null; note?: string }): Promise<Part>` — `order`는 현재 최대+1(없으면 1). 담당자는 그 책의 멤버여야 하며 아니면 `AppError('이 책의 참여자가 아닙니다.')`.
  - `updatePart(partId: string, patch: { title?: string; note?: string; assigneeUserId?: string | null }): Promise<Part>` — 같은 검증.
  - `reorderParts(bookId: string, orderedPartIds: string[]): Promise<void>` — 집합이 그 책의 파트 전체와 정확히 같지 않으면 `AppError('파트 목록이 맞지 않습니다.')`; 트랜잭션 안에서 임시로 음수 order를 거쳐 재배치(유니크 충돌 회피).
  - `listParts(bookId: string): Promise<(Part & { assignee: User | null })[]>` — order 순.
  - Actions(`manage/actions.ts`): `addMemberAction`, `removeMemberAction`, `createPartAction`, `updatePartAction`, `reorderPartsAction`, `movePartAction(partId, 'up'|'down')` — 각각 `requireUser()` → `getRole` → `canManageBook` 아니면 `notFound()`.

- [ ] **Step 1: 테스트** order 자동 증가, 비멤버 담당자 거절, reorder 정상, reorder에 다른 책 파트 id 섞이면 거절·기존 순서 유지, 보관된 책에서 createPart 거절(books.ts의 상태 확인을 parts에서도 호출).
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** 페이지: 참여자 표(이름, 역할, 제거) + 추가 폼(기존 계정 선택, 역할) / 파트 표(순서, 제목, 담당 선택, ▲▼ 버튼) + 파트 추가 폼. → **Step 4: 통과**.
- [ ] **Step 5: Commit** `git commit -m "feat: 편집장 참여자·파트 관리"`

---

### Task 10: 책 목록·파트 목록 화면

**Files:**
- Modify: `src/lib/books.ts`
- Create: `src/app/books/page.tsx`, `src/app/books/[bookId]/page.tsx`, `src/components/StatusBadge.tsx`, `src/components/BookCard.tsx`, `src/components/PartRow.tsx`, `tests/integration/book-list.test.ts`

**Interfaces:**
- Consumes: `computePartStatus`, `canViewBook`, `canManageBook`, `listParts`.
- Produces:
  - `listBooksForUser(userId: string): Promise<{ book: Book; role: BookRole; editorNames: string[]; memberCount: number; partCount: number }[]>` — ACTIVE 먼저, 그 안에서 최근 생성순, ARCHIVED는 뒤.
  - `getBookForViewer(bookId: string, actor: Actor): Promise<{ book: Book; role: BookRole | null } | null>` — `canViewBook` 아니면 null (페이지는 `notFound()`).
  - `StatusBadge({ tone, children })` — tone별 Tailwind 색(red/yellow/green/gray).
  - 파트 목록 페이지: `listParts` 결과마다 `computePartStatus({ hasVersion: false, openRequests: 0, awaitingReview: 0, completed: false })`를 호출해 배지를 그린다(2·3단계에서 입력만 바뀐다). 내 파트 행은 배경을 강조하고 "내 파트" 회색 배지를 붙인다. 편집장이면 "참여자·파트 관리" 링크.

- [ ] **Step 1: 테스트** `listBooksForUser` 정렬과 집계, 비참여자에게 `getBookForViewer`가 null, 관리자는 비참여라도 볼 수 있음.
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** 책 카드: 제목, "편집장 OOO · 교사 N명 · 파트 N개", 보관됨이면 opacity 55%와 "보관됨" 배지. 이 단계에서는 "내게 온 요청 N" 배지는 그리지 않는다(3단계). → **Step 4: 통과**.
- [ ] **Step 5: 휴대폰 폭 확인** `npm run dev`에서 브라우저 기기 모드 360px로 책 목록·파트 목록·관리 화면에 가로 스크롤 없는지 확인.
- [ ] **Step 6: Commit** `git commit -m "feat: 책 목록·파트 목록 화면"`

---

### Task 11: 마무리 — README와 전체 점검

**Files:**
- Create: `README.md` (로컬 실행: `cp .env.example .env`, `npm run db:up`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`)

- [ ] **Step 1: 전체 확인** Run: `npm run test && npm run lint && npm run build` Expected: 모두 통과.
- [ ] **Step 2: 수동 시나리오** admin 로그인 → 비밀번호 변경 → 교사 계정 2개·편집장 계정 1개 생성 → 책 생성(편집장 지정) → 편집장으로 로그인 → 교사 2명 참여자 추가 → 파트 3개 생성·담당 지정·순서 변경 → 교사로 로그인 → 책 목록에 책 1개, 파트 목록에 "내 파트" 표시와 "원고 없음" 배지, 관리 링크 없음 → 비참여 교사로 `/books/<id>` 직접 접근 시 404.
- [ ] **Step 3: Commit** `git commit -m "docs: README (로컬 실행 방법)"`
