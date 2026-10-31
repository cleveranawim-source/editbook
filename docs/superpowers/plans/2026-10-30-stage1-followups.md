# 1단계 이후로 미룬 항목 (최종 검토에서 나온 것)

1단계 뼈대는 완료·검토 통과. 아래는 고치지 않고 다음 단계로 넘긴 것들이다.

## 배포 전 반드시 — 2026-10-31 처리함

- [x] 로그인 시도 제한(`src/lib/auth/throttle.ts`, 메모리 기반·단일 프로세스 가정). 서버를 여러 대로 늘리면 DB 테이블로 옮긴다.
- [x] 없는 아이디와 틀린 비밀번호의 응답 시간을 같게(더미 bcrypt 비교).
- [x] 시드가 운영(NODE_ENV=production)에서 예시 비밀번호·8자 미만을 거부.
- [x] Dockerfile(`npm ci` 전에 prisma/ 복사, 런타임에 tsx·prisma CLI 포함) + `docker-compose.prod.yml` + `docs/deploy.md`.
- [x] 로그인 아이디 소문자 정규화 + 기존 행 소문자화 마이그레이션.
- [ ] 임시 공개(`scripts/share.sh`, Cloudflare 임시 터널)는 시험용. 계속 쓰려면 클라우드 서버로 옮긴다.

## 기능 보완 (편의)

- 사용자가 스스로 비밀번호를 바꾸는 화면 진입 링크, 현재 비밀번호 확인, 이전과 같은 비밀번호 거부.
- 편집장이 참여자 역할을 바꾸는 UI, "제거" 확인 대화상자(자기 자신 제거 시 404 되는 문제).
- 관리자 책 제목 수정.
- 파트 삭제 규칙(원고 버전이 생긴 뒤 결정) — 2단계에서 정한다.
- 만료된 세션 행 정리 작업.
- `addMember` upsert로 마지막 편집장을 교사로 바꾸는 경로 막기.
- 동시 `createPart`의 order 충돌(P2002)을 AppError로 매핑.

## 코드 정리

- 세션 쿠키 옵션 중복(`login/actions.ts`, `change-password/actions.ts`) → `setSessionCookie` 헬퍼.
- manage 페이지·액션의 권한 조회 중복 → `getBookForManager(bookId, actor)` 헬퍼.
- 사용 안 하는 `reorderPartsAction` 제거.
- Prisma client `omit: { user: { passwordHash: true } }` 고려 (클라이언트 컴포넌트로 해시가 새는 것 원천 차단).
- 테스트 공백: 액션 레벨 권한(`authorize`, `requireAdmin`) 자동 테스트, Playwright 시나리오 커밋.
- 기타: 미사용 `public/*.svg`, `@types/node` 버전, schema.prisma 안내 주석, 테스트 `$disconnect`.

## 2단계 설계 메모

- 파트 단위 액션은 `canViewBook`과 `canEditPart`를 함께 확인하고, `canEditPart`를 단일 기준으로 유지한다.
- `computePartStatus` 입력(`hasVersion`, `openRequests`, `awaitingReview`, `completed`)을 실제 데이터로 채우는 지점은 `src/components/PartRow.tsx`와 책 목록 카드.
