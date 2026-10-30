---
version: 1
slug: "src-app-books-bookid-page-tsx"
primary_target: "src/app/books/[bookId]/page.tsx"
related_targets: ["src/app/layout.tsx","src/app/books/page.tsx","src/app/books/[bookId]/manage/page.tsx","src/app/login/page.tsx","src/app/admin/users/page.tsx","src/app/admin/books/page.tsx"]
---

## Scope

- Surface: EditBook 1단계 전체 화면(로그인, 비밀번호 변경, 책 목록, 책 화면=파트 목록, 참여자·파트 관리, 관리자 계정·책, 404). 핵심 화면은 책 화면(파트 목록).
- Mode: Operate. 사용자는 낮에 학교·회사 PC에서 쓴다(밝은 사무실). 휴대폰은 보조.
- Audience/job: 편집장은 "내 차례"인 파트를 찾아 연다. 교사는 자기 파트와 상태를 본다. 관리자는 계정·책을 만든다.
- Constraints: 모든 문구 한국어. 상태 색 네 가지 의미 고정(빨강 내 차례·노랑 상대 차례·초록 완료·회색 대기), 색만으로 구분하지 않음. 본문 16px 이상, 터치 44px 이상. 360px 가로 스크롤 없음. 표준 웹 컨트롤만.
- Must stay untouched: 기능, 경로, Server Action, 데이터 함수, 문구의 의미.
- Would feel wrong: 딱딱한 행정 시스템(회색 표·작은 글자), 알록달록한 교육 앱, 광고 랜딩.

## Direction contract

THESIS: EditBook은 원고를 다루는 책상이다. 바탕은 200자 원고지이고, 진행은 채워진 칸으로 읽힌다. 회색 표에 파란 버튼을 얹은 관리 화면의 배치를 거부한다.

OWN-WORLD: 흰 종이 위에 적갈색(#B5542A) 원고지 격자가 흐리게 깔리고(큰 칸 112px, 작은 칸 28px), 내용은 흰 카드가 격자를 가리며 앉는다. 선은 1px 적갈색 틴트, 그림자는 없거나 아주 부드럽게. 잉크 #1F1F1F. 제목·책 이름·파트 번호는 Noto Serif KR 700/900, UI는 Noto Sans KR 400/500/700, 숫자는 tabular. 상태: 빨강 #D23B2E, 호박 #D08A00(글자 #8A5D00), 초록 #2E7D5B, 회색 #8E8E8E. 주 버튼은 잉크 검정 면에 적갈색 밑줄 3px. 원고지 진행 띠: 작은 네모 4칸(원고·검토·확인·완료)이 순서대로 채워진다. 포커스 링·선택 색·캐럿도 적갈색.

STORY: 들어오면 "내 차례 N"이 먼저 읽히고, 그 행을 찾아 연다. 교사는 자기 파트가 어디 있고 지금 누구 차례인지 3초 안에 안다.

FIRST VIEWPORT (책 화면, 1440): 상단 56px 흰 바에 적갈색 네모 마크 + "EditBook" 세리프, 오른쪽에 이름·역할·로그아웃, 바 아래 2px 적갈색 선. 그 아래 원고지 바탕. 왼쪽 248px 흰 카드에 "내 책" 목록(현재 책은 적갈색 채운 네모 마크 + 굵게 + 연한 틴트). 오른쪽 흰 카드: 세리프 34px 책 제목, 메타 한 줄, 그 아래 "내 차례 3 · 상대 차례 2 · 완료 4" 테두리 칩, 주 버튼 "참여자·파트 관리"는 카드 오른쪽 위. 파트 목록은 고정 62px 행: 세리프 적갈색 순서 숫자, 제목 + 버전 메타, 담당, 진행 띠, 상태 배지, "열기". 내 차례 행은 연한 붉은 바탕 + "내 차례" 빨간 태그(굵은 색 테두리 선 없음).

FORM: 원고지(200자 원고지 격자). 내 순위 목록 1위(IMPECCABLE'S PICK, 배정은 4위 교무수첩이었으나 사용자가 원고지를 선택). seed:0709651e59a9a79b. Signature interaction: 페이지가 열릴 때 진행 띠의 칸이 60ms 간격으로 순서대로 채워지고(채우기 150ms ease-out), 행에 마우스를 올리면 카드가 격자 위로 1px 떠오르는 대신 적갈색 1px 테두리가 진해진다. Motion grammar: 150ms cubic-bezier(.2,.8,.2,1), 바운스 없음, prefers-reduced-motion이면 정지 상태로 바로 그림.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- 로고 자산 없음: 적갈색 네모 마크는 CSS로 그린다(원고지 한 칸).
- 2·3단계에서 진행 띠·배지에 실제 값이 들어간다. 지금은 모든 파트가 "원고 없음"(0칸).
