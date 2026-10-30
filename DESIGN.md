---
name: EditBook
description: 흰 종이 위 적갈색 200자 원고지 격자. 내용은 흰 카드가 격자를 가리며 앉고, 진행은 채워진 칸으로 읽힌다.
colors:
  paper: "#ffffff"
  ink: "#1f1f1f"
  ink-2: "#555555"
  ink-3: "#707070"
  rb: "#b5542a"
  rb-tint: "#fbf4ef"
  rb-line: "rgba(181, 84, 42, 0.45)"
  rule: "#e7dcd5"
  field: "#bfb4ac"
  quiet: "#cccccc"
  mine: "#fef3f1"
  st-red: "#d23b2e"
  st-red-fg: "#b3261e"
  st-red-bg: "#fdf0ee"
  st-amber: "#d08a00"
  st-amber-fg: "#8a5d00"
  st-amber-bg: "#fff8e8"
  st-green: "#2e7d5b"
  st-green-bg: "#eef7f2"
  st-gray: "#8e8e8e"
  st-gray-fg: "#5c5c5c"
  st-gray-bg: "#f3f3f3"
typography:
  display:
    fontFamily: "Noto Serif KR, Apple SD Gothic Neo, serif"
    fontSize: "34px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Noto Serif KR, Apple SD Gothic Neo, serif"
    fontSize: "28px"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Noto Serif KR, Apple SD Gothic Neo, serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0em"
  numeral:
    fontFamily: "Noto Serif KR, Apple SD Gothic Neo, serif"
    fontSize: "22px"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "0em"
  body:
    fontFamily: "Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0em"
  caption:
    fontFamily: "Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.375
    letterSpacing: "0em"
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  cell: "28px"
  3xl: "32px"
  4xl: "56px"
  cell-major: "112px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "12px 20px 9px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#000000"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.rb-tint}"
  button-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  button-quiet-hover:
    textColor: "{colors.ink}"
  button-quiet-sm:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "34px"
  button-danger:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.st-red-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.st-red-bg}"
  button-quiet-danger:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.st-red-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "34px"
  button-quiet-danger-hover:
    backgroundColor: "{colors.st-red-bg}"
  button-square:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0"
    size: "36px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px"
  card-lg:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "32px"
  card-band:
    backgroundColor: "{colors.rb-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px 28px 24px"
  table-head:
    backgroundColor: "{colors.rb-tint}"
    textColor: "{colors.ink-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    height: "40px"
  part-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 24px 0 0"
    height: "62px"
  part-row-my-turn:
    backgroundColor: "{colors.mine}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
    height: "44px"
  input-disabled:
    backgroundColor: "{colors.rb-tint}"
    textColor: "{colors.ink-3}"
  status-badge-red:
    backgroundColor: "{colors.st-red-bg}"
    textColor: "{colors.st-red-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  status-badge-yellow:
    backgroundColor: "{colors.st-amber-bg}"
    textColor: "{colors.st-amber-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  status-badge-green:
    backgroundColor: "{colors.st-green-bg}"
    textColor: "{colors.st-green}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  status-badge-gray:
    backgroundColor: "{colors.st-gray-bg}"
    textColor: "{colors.st-gray-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  tag:
    backgroundColor: "{colors.rb-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  turn-tag-turn:
    backgroundColor: "{colors.st-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "1px 7px"
  turn-tag-mine:
    backgroundColor: "{colors.rb-tint}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    padding: "1px 7px"
  book-nav-current:
    backgroundColor: "{colors.rb-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 20px"
  empty-state-box:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    padding: "24px 28px"
  progress-cell:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    size: "14px"
  top-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "58px"
---

# Design System: EditBook

## Overview

**Creative North Star: "원고지 위의 책상"**

EditBook은 원고를 다루는 책상이다. 화면 바탕은 흰 종이에 적갈색 200자 원고지 격자가 흐리게 깔린 것이고, 모든 내용은 그 위에 놓인 흰 종이 한 장(카드)이다. 격자는 장식이 아니라 자(尺)다: 큰 칸 112px, 작은 칸 28px이 화면 가운데에 맞춰 깔리고, 1408px 틀(내용 폭 1344px = 큰 칸 12개)의 카드 가장자리가 큰 칸 선 위에 정확히 놓인다. 카드 사이 간격도 작은 칸 하나(28px)다.

대담함은 두 군데에만 쓴다. 원고지 바탕과 세리프 숫자(파트 순서, 개수 칩)다. 나머지는 조용하고 정확하다: 모서리는 둥글지 않고, 그림자는 없고, 선은 1px 적갈색 틴트다. 색은 의미가 있을 때만 쓴다. 상태 색 네 가지(빨강 내 차례·노랑 상대 차례·초록 완료·회색 대기)는 뜻이 고정되어 있고 늘 글자와 함께 쓴다. 적갈색 틴트(rb-tint)는 "격자에 물든 종이"이지 상태가 아니다.

사용자 다수가 40~50대 교사이므로 본문은 16px 이상, 가장 작은 글자도 12.5px 아래로 내려가지 않고, 누르는 자리는 44px 이상이다. 회색 표에 파란 버튼을 얹은 행정 시스템의 배치는 거부한다.

**Key Characteristics:**
- 흰 종이(#ffffff) 위 적갈색 원고지 격자(112/28px), 카드 가장자리가 큰 칸 선에 정렬
- 모서리 0px, 그림자 없음, 1px 적갈색 틴트 선으로만 구획
- 세리프 900 적갈색 숫자와 세리프 제목, 산세리프 UI, tabular 숫자
- 상태 색 네 가지 뜻 고정, 빨강 계열은 "내 차례"에만
- 유일한 움직임: 진행 띠의 칸 채움(150ms, 60ms 간격)
- 포커스 링·캐럿·선택 색·스크롤바가 모두 적갈색

## Colors

흰 종이와 잉크, 그리고 원고지 적갈색 하나. 그 위에 뜻이 고정된 상태 색 네 벌.

### Primary
- **원고지 적갈색 / rb** (#b5542a): 격자선(투명도 0.2/0.09), 파트 순서 숫자, 주 버튼 밑줄 3px, 상단 바 아래 2px 선, 상표 네모, 현재 책 표시 네모(10px), 진행 띠 칸 테두리와 채움, 포커스 링, 캐럿, 링크 밑줄(투명도 0.6), 선택 색(투명도 0.22), 스크롤바(투명도 0.45), 행·카드 호버 시 진해지는 테두리.
- **격자에 물든 종이 / rb-tint** (#fbf4ef): 표 머리 띠, 카드 아래 추가·만들기 띠(CardBand), 역할·구분 꼬리표 바탕, 현재 책 항목과 그 호버, 보조 버튼 호버, 비활성 입력란 바탕. 중립 틴트이며 상태를 뜻하지 않는다.
- **적갈색 옅은 선 / rb-line** (rgba(181, 84, 42, 0.45)): 카드 테두리, 표 머리 띠 아래 선, 꼬리표 테두리, 빈 상태의 점선.

### Neutral
- **종이 / paper** (#ffffff): 바탕과 카드. 보관된 책 카드만 60% 불투명 종이(bg-paper/60)로 격자가 비친다.
- **잉크 / ink** (#1f1f1f): 본문, 제목, 주 버튼 면.
- **잉크 2 / ink-2** (#555555): 보조 글자(메타 줄, 글자표, 표 머리, 조용한 버튼). 흰 바탕 7.5:1.
- **잉크 3 / ink-3** (#707070): 3순위 글자(개수, 담당 없음, placeholder, 사이드바 상태). 흰 바탕 4.95:1, 틴트 바탕 4.55:1. 규격의 #767676은 틴트 위에서 4.17:1이라 어두워졌다.
- **괘선 / rule** (#e7dcd5): 표의 행 구분선, 카드 안 구역 선.
- **입력란 선 / field** (#bfb4ac): Input·Select·Textarea 테두리.
- **조용한 선 / quiet** (#cccccc): quiet·quietDanger 버튼 테두리.

### Status (뜻이 고정된 네 벌)
- **내 차례 빨강 / st-red** (#d23b2e) · 글자 **st-red-fg** (#b3261e) · 바탕 **st-red-bg** (#fdf0ee): 요청 N 배지, 내 차례 개수 칩, "내 차례" 꼬리표 면, 양식 오류, 잘못된 입력란 테두리, 위험 버튼. 글자는 연한 바탕 위에서 4.5:1을 지키려 더 어두운 st-red-fg를 쓴다.
- **상대 차례 노랑 / st-amber** (#d08a00) · 글자 **st-amber-fg** (#8a5d00) · 바탕 **st-amber-bg** (#fff8e8): 편집장 검토 중·확인 대기 배지, 상대 차례 칩, "첫 로그인 전" 배지.
- **완료 초록 / st-green** (#2e7d5b) · 바탕 **st-green-bg** (#eef7f2): 완료 배지와 칩, 진행 띠 4칸 모두 찬 상태의 칸 색.
- **대기 회색 / st-gray** (#8e8e8e) · 글자 **st-gray-fg** (#5c5c5c) · 바탕 **st-gray-bg** (#f3f3f3): 원고 없음 배지, 보관됨 배지.
- **내 차례 행 / mine** (#fef3f1): 내 차례(REQUESTS) 행의 바탕. 빨강 계열 바탕은 이 한 곳뿐이다.

### Named Rules
**The Four Meanings Rule.** 빨강은 내 차례, 노랑은 상대 차례, 초록은 완료, 회색은 대기다. 이 뜻 밖에서 상태 색을 쓰지 않는다. 그래서 관리자 책 목록의 "진행 중"은 초록이 아니라 중립 꼬리표(rb-tint)다. 색은 늘 글자와 함께 쓴다.

**The Red Is Mine Rule.** 연한 붉은 바탕(mine)과 빨간 "내 차례" 꼬리표는 내 차례(REQUESTS) 행에만 붙는다. 내가 담당이지만 내 차례가 아닌 행은 틴트 "내 파트" 꼬리표만 받고 바탕은 흰 종이 그대로다.

**The Tint Is Not Status Rule.** rb-tint는 격자에 물든 종이다. 표 머리, 추가 띠, 역할 꼬리표, 현재 책, 호버에 쓰되 어떤 진행 상태도 뜻하지 않는다.

**The One Accent Rule.** 적갈색은 격자·숫자·선·브라우저 표면(포커스·캐럿·선택·스크롤바)에만 산다. 버튼 면이나 큰 면적의 채움으로 쓰지 않는다. 주 버튼은 잉크 면에 적갈색 밑줄이다.

## Typography

**Display Font:** Noto Serif KR 700/900 (fallback Apple SD Gothic Neo, serif) — next/font, latin 미리 받기, 한글은 unicode-range 조각
**Body Font:** Noto Sans KR 400/500/700 (fallback Apple SD Gothic Neo, Malgun Gothic, sans-serif)

**Character:** 세리프는 책과 원고의 목소리다. 제목, 책 이름, 파트 순서 숫자, 개수에 쓴다. 산세리프는 UI의 목소리다. 본문 16px/1.5, `font-variant-numeric: tabular-nums`, `word-break: keep-all`(어절 단위 줄바꿈)이 body 기본이다. 제목은 `text-wrap: balance`, 문단은 `text-wrap: pretty`.

### Hierarchy
- **Display** (serif 900, 34px ≥768 / 28px 미만, 1.2, -0.015em): 책 화면의 책 제목 한 곳.
- **Headline** (serif 900, 28px, 1.25, -0.01em): 화면 제목(PageHeader "내 책", "{책} 관리", "계정 관리"), AuthCard 제목(로그인·비밀번호·404).
- **Brand** (serif 900, 22px, 1, +0.01em): 상단 바 "EditBook".
- **Numeral** (serif 900, 22px, 1.1, 적갈색): 파트 순서 숫자(책 화면·관리 화면). 개수 칩의 숫자는 같은 얼굴로 17px, 상태 색.
- **Title** (serif 700, 20px, 1.25~1.375): 카드 구역 제목(CardTitle), 책 카드 제목. 관리자 책 목록의 책 제목 링크는 18px.
- **Body** (sans 400, 16px, 1.5): 본문, 입력란, 사이드바 책 이름, 참여자 이름(700).
- **Row title** (sans 700, 17px, snug): 파트 행 제목.
- **Body-sm** (sans 400/500/700, 15px·14px): 15px은 상단 바 이름·버튼 글자·뒤로 링크·아이디; 14px은 메타 줄, 담당, 꼬리표·배지(700), 글자표(700, ink-2).
- **Caption** (sans, 13px): 표 머리 글자(700, ink-2), 파트 메모, 입력 힌트, 사이드바 상태(ink-3), 작은 버튼 글자. "내 차례"·"내 파트" 꼬리표만 12.5px.

### Named Rules
**The Serif Numeral Rule.** 순서와 개수는 세리프 900으로 쓴다. 파트 순서는 적갈색, 개수 칩의 숫자는 그 칩의 상태 색이다. 이것이 머리말까지 이어지는 이 세계의 서명이다.

**The 12.5 Floor Rule.** 가장 작은 글자는 12.5px(꼬리표)이고 그 외는 13px 이상이다. 표 머리 13px, 배지·꼬리표 14px, 본문 16px. 더 작게 내리지 않는다.

## Layout

- **틀:** 상단 바와 본문 모두 `max-w-[1408px]`, 가운데 정렬, 좌우 여백 16px(≥768: 32px). 내용 폭 1344px = 큰 칸 12개. 본문 위 여백 28px(작은 칸 하나), 아래 56px.
- **상단 바:** 높이 58px(56px + 아래 2px 적갈색 선), 흰 바탕. 왼쪽 상표(20px 원고지 한 칸, 2px 테두리, 아래 5px 채움) + "EditBook". 오른쪽 이름(15px 700), 관리자면 "관리자" 꼬리표(≥640만), 조용한 로그아웃(sm).
- **원고지 바탕:** 네 겹 선형 그라데이션. 큰 칸 112px 선 rgba(181,84,42,0.2), 작은 칸 28px 선 rgba(181,84,42,0.09), 각 1px. 가로 기준점은 화면 가운데(`calc(50% + 56px)` / `calc(50% + 14px)`)를 `round(up, …, 1px)`로 정수 픽셀에 맞춘다(홀수 폭 화면에서 선이 2px로 번지는 것을 막는다). 세로 기준점은 `--bar-h: 58px`, 상단 바 바로 아래. `background-attachment: fixed`, 640px 미만에서는 `scroll`.
- **한 칸이 간격:** 카드 사이 gap 28px(책 화면 사이드바·본문, 책 목록 격자, 관리 화면 카드 사이). 카드 안 여백은 20px(≥768: 좌우 28px), AuthCard는 24px(≥640: 32px).
- **책 화면(≥1024):** `252px + 1fr` 두 열. 사이드바 "내 책" 카드는 252px(작은 칸 9개), `sticky top-28px`. 파트 표 열은 `56px 1fr 128px 150px 236px`(순서·파트·담당·진행·상태), 행 높이 62px 고정, 오른쪽 여백 24px.
- **책 화면(<1024):** 사이드바를 숨기고 "내 책으로" 뒤로 링크를 보인다. 행은 `36px 1fr`로 번호를 왼쪽에 세우고 제목 / 담당·진행 / 상태 세 줄로 쌓인다. 꼬리표는 제목 마지막 어절 뒤에 inline으로 붙는다.
- **책 목록:** 1열 / ≥768 2열 / ≥1280 3열, gap 28px. 카드 전체가 링크, 꼬리표는 카드 바닥에 고정(mt-auto)이라 같은 줄 카드가 맞춰진다.
- **관리·관리자 화면:** `max-w-[1064px]`(작은 칸 38개), 왼쪽 정렬. 참여자 행 min 52px, 파트 관리 열 `56px 1fr 200px 80px`, 관리자 표 행 min 56px. 표 머리 띠(40px)는 ≥1024에서만 그린다.
- **AuthCard:** 폭 392px(작은 칸 14개), `min-h: calc(100dvh − 58px − 84px)` 안에서 세로 가운데. 입력란 사이 16px, 버튼은 전체 폭.
- **중단점:** 640(상단 바 꼬리표, 바탕 고정 여부, AuthCard 여백), 768(열 수·카드 여백·Display 크기), 1024(두 열·표 머리·62px 행), 1280(책 목록 3열). 360px에서 모든 화면 scrollWidth 360(측정).
- **누르는 자리:** 보이는 높이가 34px(sm 버튼)·36px(정사각 아이콘 버튼)이어도 `.hit-44`로 44px 이상을 확보한다. 링크·뒤로 링크·관리자 링크는 `min-h-11`.

## Elevation & Depth

그림자가 없다. 깊이는 종이 한 장이 격자를 가리는 것으로만 생긴다: 흰 카드(paper)가 원고지 바탕 위에 1px rb-line 테두리로 앉고, 카드 안은 rule(#e7dcd5) 괘선과 rb-tint 띠로만 나뉜다. 호버는 떠오르지 않는다. 책 카드는 테두리가 rb로 진해지고(150ms), 파트 행은 위아래 괘선이 rb로 진해진다(`hover:border-b-rb has-[+li:hover]:border-b-rb`), 바탕은 그대로다. 빈 상태(box)는 점선 테두리의 "아직 채워지지 않은 종이"가 격자 위에 바로 놓인다. 카드 안에서는 테두리 없이 괘선 한 줄(inline)만 쓴다: 상자 속 상자를 만들지 않는다.

### Named Rules
**The Paper On Grid Rule.** 깊이는 한 겹뿐이다. 격자 위 종이. 그림자·블러·떠오름 호버를 쓰지 않고, 호버는 선이 진해지는 것으로 말한다.

**The No Nested Box Rule.** 카드 안에 테두리 상자를 넣지 않는다. 빈 상태는 카드를 대신하거나(box), 카드 안에서는 괘선만 남긴다(inline).

## Shapes

모든 모서리는 0px이다(Tailwind `rounded` 계열 사용 없음). 모든 구획은 1px 선이다: 카드와 꼬리표는 rb-line, 표 괘선은 rule, 입력란은 field, 조용한 버튼은 quiet, 상태 배지는 그 톤 색, 빈 상태는 rb-line 점선. 굵은 선은 셋뿐이다: 상단 바 아래 2px rb, 주 버튼 밑줄 3px rb, 상표·진행 띠 칸 테두리 2px/1.5px rb. 정사각형이 반복되는 형태다: 상표(20px, 아래 5px 채움), 현재 책 표시(10px 채움), 진행 띠 칸(14px). 아이콘은 1.5px 선으로 그린 꺾쇠 SVG(16px, `stroke-linecap: square`)뿐이고, Select의 꺾쇠(12×8px, #555555)도 같은 언어다. 왼쪽 색 막대(border-left)로 상태를 말하지 않는다.

## Components

### Buttons (Button / ButtonLink)
- **Shape:** 모서리 0px, `inline-flex`, `whitespace-nowrap`, `active:translate-y-px`, 비활성 `opacity-50`, pending은 `aria-busy`와 `cursor-progress`, `pendingLabel`로 글자 교체("로그인 중…").
- **Primary:** 잉크 면(#1f1f1f)에 흰 글자 15px 700, 아래 3px rb 밑줄, padding 12px 20px 9px(밑줄 균형), 높이 44px. 호버 #000000. 드물게 쓴다: 로그인, 비밀번호 변경, 참여자·파트 관리, 404의 내 책으로 가기. 양식 띠의 제출은 모두 secondary.
- **Secondary:** 흰 면, 1px ink 테두리, ink 15px 700, padding 0 16px, 44px. 호버 rb-tint 바탕.
- **Quiet:** 흰 면, 1px quiet(#cccccc) 테두리, ink-2 14px 500, padding 0 12px. 호버 테두리 ink-3·글자 ink. 로그아웃, 비밀번호 초기화.
- **Danger:** 흰 면, 1px st-red 테두리, st-red-fg 14px 700. 호버 st-red-bg.
- **Quiet Danger:** 평소 quiet 테두리에 st-red-fg 글자, 호버 시 st-red 테두리 + st-red-bg. 목록마다 되풀이되는 "제거"에 쓴다(아홉 개의 빨간 상자가 오류 목록처럼 읽히는 것을 피한다).
- **Sizes:** md 44px; sm 보이는 높이 34px, 글자 13px, `.hit-44`로 누르는 자리 44px.
- **Square:** 아이콘 버튼. 좁은 화면 44px, ≥1024 36px, 누르는 자리 44px. 파트 순서 ▲▼는 ChevronUp/Down SVG.
- **Motion:** `transition-[background-color,border-color,color] 150ms cubic-bezier(.2,.8,.2,1)`.

### Cards / Containers (Card, CardTitle, CardBand)
- **Corner Style:** 0px.
- **Background:** paper, 1px rb-line 테두리. 보관된 책 카드만 paper 60%.
- **Shadow Strategy:** 없음(Elevation 참조).
- **Internal Padding:** none / md 20px / lg 24px(≥640: 32px). 구역 카드는 제목에 `px-5 pb-4 pt-5 md:px-7`.
- **CardTitle:** serif 700 20px, 옆에 개수를 sans 15px 500 ink-3로("3명", "8개").
- **CardBand:** 카드 아래 rb-tint 띠, 위 1px rb-line, padding 20px 20px 24px(≥768 좌우 28px), 제목 16px 700. 추가·만들기 양식을 담는다.
- **Hover (링크 카드):** 테두리 rb-line → rb, 150ms.

### Inputs / Fields (Field, Input, Select, Textarea, FormError, InlineError)
- **Field:** `<label>`이 입력란을 감싼다. 글자표 14px 700 ink-2, 아래 1.5·6px 간격, 힌트 13px ink-2. 표가 이름을 대신하면 `lg:sr-only`.
- **Style:** 흰 면, 1px field(#bfb4ac) 테두리, 16px ink, padding 10px 12px, min 44px, 모서리 0px, placeholder ink-3.
- **Hover / Focus:** 호버 테두리 ink-3, 포커스 테두리 rb(링과 함께). 150ms.
- **Error:** `aria-invalid` 또는 `:user-invalid`에 st-red 테두리. FormError는 st-red-bg 바탕 + 1px st-red 테두리 + st-red-fg 14px, `role="alert"`, 버튼 위. InlineError는 상자 없이 st-red-fg 14px.
- **Disabled:** rule 테두리, rb-tint 바탕, ink-3 글자, `cursor-not-allowed`.
- **Select:** `appearance: none`, 오른쪽 14px에 12×8 꺾쇠 SVG(#555555, 1.5px), 오른쪽 여백 40px.
- **Checkbox:** 20px, `accent-color` rb(관리자 만들기).

### StatusBadge
- 1px 톤 색 테두리, 톤 바탕, 톤 글자, 14px 700, line-height 1.35, padding 2px 8px, 점(dot) 없음, 모서리 0px.
- 톤: red(st-red / st-red-bg / st-red-fg), yellow(st-amber / st-amber-bg / st-amber-fg), green(st-green / st-green-bg / st-green), gray(st-gray / st-gray-bg / st-gray-fg).
- 파트 상태 매핑(`lib/part-status.ts`): 원고 없음 gray · 편집장 검토 중 yellow · 요청 N red · 확인 대기 N yellow · 완료 green. 보관됨 gray, 첫 로그인 전 yellow.

### Tag / RoleTag / TurnTag
- **Tag:** rb-tint 바탕, 1px rb-line 테두리, 14px 700, padding 2px 8px. `strong`이면 ink, 아니면 ink-2. 역할(편집장 ink / 교사 ink-2), 관리자, 진행 중(관리자 책 목록). 상태 색을 쓰지 않는 중립 표시.
- **TurnTag "내 차례":** st-red 면에 흰 글자 12.5px 700, padding 1px 7px, 테두리 없음. REQUESTS 행에만.
- **TurnTag "내 파트":** rb-tint 바탕 + rb-line 테두리, ink-2 12.5px 700. 내가 담당인 행.
- 둘 다 `whitespace-nowrap`, ≥1024에서 `shrink-0`으로 한 줄 유지.

### ProgressStrip (signature)
- 원고·검토·확인·완료 네 칸. 칸 14px, 1.5px rb 테두리, 흰 바탕, 칸 사이 3px. `role="img" aria-label="진행 N/4"`.
- 채운 칸 수: NO_MANUSCRIPT 0 · EDITOR_REVIEW 1 · REQUESTS 2 · AWAITING 3 · DONE 4. DONE이면 테두리와 채움이 st-green.
- 채움은 `::before`가 rb로 번진다: `cell-fill` 150ms `cubic-bezier(.2,.8,.2,1)`, `scale(.6)→1` + opacity, 지연 `--i × 60ms`(최대 390ms). 칸 테두리는 움직이지 않는다. 이것이 화면의 유일한 움직임이며, 모든 행의 띠가 같은 박자로 찬다.
- 1단계에서는 모든 파트가 원고 없음(0칸)이라 채움이 보이지 않는다.

### TableHead
- ≥1024에서만 그리는 40px rb-tint 머리 띠, 아래 1px rb-line, 13px 700 ink-2. `aria-hidden`(행이 스스로 이름을 붙인다). 열 폭은 행과 같은 grid 클래스를 받는다.

### PartRow
- ≥1024: 62px 고정 한 줄, `56px 1fr 128px 150px 236px`, 아래 1px rule, 마지막 행 선 없음. 순서 serif 900 22px rb 가운데 정렬 · 제목 17px 700(truncate) + 메모 13px ink-2 · 담당 14px(없으면 ink-3 "담당 없음") · ProgressStrip · StatusBadge.
- 호버: 행의 아래 괘선과 바로 위 행의 아래 괘선이 rb로 진해진다. 바탕 변화 없음.
- 내 차례(REQUESTS): 바탕 mine + "내 차례" 꼬리표. 내 파트: "내 파트" 꼬리표만.
- <1024: `36px 1fr`, 번호 왼쪽, 세 줄 쌓기, 꼬리표 제목 뒤 inline(`align-[2px]`).

### Navigation (top bar, BookNav, BackLink, admin links)
- **Top bar:** Layout 참조. 상표 링크는 `min-h-11`, 밑줄 없음.
- **BookNav:** 카드(`py-4`), 제목 "내 책" 14px 700 ink-2. 항목 `min-h-12 px-5 py-2.5`, 왼쪽 10px 네모(현재 책만 rb 채움), 이름 16px(현재 책 700), 아래 상태 13px ink-3. 현재 책과 호버는 rb-tint, `aria-current="page"`. ≥1024에서만, sticky top 28px.
- **BackLink:** ChevronLeft 16px + 15px 500 ink-2, `min-h-11`, 호버 ink + 밑줄.
- **Links:** 밑줄 1px rgba(181,84,42,0.6), offset 3px. 관리자 링크(계정 관리 · 책 관리)는 ink 500 밑줄, 호버 rb.

### PageHeader
- serif 900 28px 1.25 -0.01em, 옆에 개수 sans 16px 500 ink-3("4권"), 아래 24px.

### EmptyState
- 한 문장(ink-2, max 60ch) + 있으면 할 일 하나(secondary 버튼), ≥640에서 가로 배치.
- **box:** 1px rb-line 점선, paper, padding 24px 20px(≥768 좌우 28px). 격자 위에 카드 대신 놓인다.
- **inline:** 위 1px rule만, 카드 안 행 자리.

### AuthCard
- Card lg(24/32px), 폭 392px, 격자 가운데. 제목 serif 900 28px, 아래 6px에 lead(ink-2 16px), 28px 아래 양식. 로그인·새 비밀번호·404가 같은 종이 한 장을 쓴다.

### CountChip (책 화면 머리말)
- 1px 톤 테두리 + 톤 글자 14px 700, 숫자 serif 900 17px, padding 5px 12px. 0이면 흰 바탕, 1 이상이면 톤 바탕. 내 차례 red · 상대 차례 yellow · 완료 green.

### Browser surfaces
- `color-scheme: light`, 선택 rgba(181,84,42,0.22), 캐럿 rb, `:focus-visible` 2px rb 링 offset 2px(`:focus`의 기본 outline 제거, 모든 요소의 `outline-color`를 rb로 미리 지정해 transition-colors가 검정에서 번지지 않게), 스크롤바 10px rb 0.45 thumb(2px 투명 테두리, track 투명), `-webkit-text-size-adjust: 100%`, 버튼·select·checkbox에 pointer.
- Motion: 기본 transition 150ms `cubic-bezier(0.2, 0.8, 0.2, 1)`(`--ease-paper`), 바운스 없음. `prefers-reduced-motion: reduce`면 모든 animation·transition 없음, 채운 칸은 바로 그려진다.

## Do's and Don'ts

### Do:
- **Do** 카드 사이와 본문 위 간격을 28px(작은 칸 하나)로 두고, 큰 틀은 1408px·1064px·392px·252px처럼 28px의 배수로 잡아 카드 가장자리를 격자선에 맞춘다.
- **Do** 순서와 개수는 Noto Serif KR 900으로, 파트 순서는 rb(#b5542a)로 쓴다.
- **Do** 상태는 StatusBadge·CountChip·ProgressStrip에 네 가지 뜻(빨강 내 차례·노랑 상대 차례·초록 완료·회색 대기)으로만 쓰고 늘 글자를 함께 둔다.
- **Do** 연한 바탕 위 빨강 글자는 st-red-fg(#b3261e), 호박 글자는 st-amber-fg(#8a5d00)를 쓴다.
- **Do** 호버는 선이 진해지는 것으로 말한다: 카드 테두리 rb-line → rb, 행 괘선 rule → rb, 150ms.
- **Do** 모든 전환은 150ms `cubic-bezier(.2,.8,.2,1)`, 등장 동작은 ProgressStrip 채움만.
- **Do** 보이는 높이가 34·36px인 컨트롤에도 `.hit-44`로 44px 누르는 자리를 준다.
- **Do** 본문 16px, 가장 작은 글자 12.5px(꼬리표)·13px(표 머리·메모) 이상을 지킨다.
- **Do** 아이콘은 1.5px 선 꺾쇠 SVG(`icons.tsx`)로 그리고 `currentColor`를 따른다.
- **Do** 빈 상태는 카드를 대신하거나(box) 카드 안에서는 괘선만 남긴다(inline).

### Don't:
- **Don't** 그림자(box-shadow), 블러, 떠오름(translateY) 호버를 쓰지 않는다. 깊이는 격자 위 종이 한 겹뿐이다.
- **Don't** 모서리를 둥글리지 않는다(`rounded-*` 금지).
- **Don't** 왼쪽 색 막대(border-left)로 상태나 현재 항목을 표시하지 않는다. 현재 책은 10px 채운 네모와 틴트다.
- **Don't** 제목 위 작은 대문자·자간 넓은 눈썹(eyebrow/kicker), `uppercase`, 넓은 `letter-spacing`을 쓰지 않는다.
- **Don't** 유니코드 글리프(▲▼→✓× 등)를 아이콘으로 쓰지 않는다.
- **Don't** 빨강 계열 바탕(mine, st-red-bg)을 내 차례 행과 오류 밖에서 쓰지 않는다. 초록을 "진행 중"에 쓰지 않는다(초록은 완료).
- **Don't** 상태 배지에 점(dot)을 붙이거나 색만으로 뜻을 전하지 않는다.
- **Don't** 적갈색을 버튼 면이나 큰 면적의 채움으로 쓰지 않는다. 주 버튼은 잉크 면 + 적갈색 밑줄 3px이다.
- **Don't** Tailwind 기본 팔레트(gray-*, blue-* 등)를 쓰지 않는다. `--color-*: initial`로 비워져 있어 렌더링되지 않는다.
- **Don't** 글자가 있는 요소에 `opacity`로 흐림을 주지 않는다. 보관된 카드는 바탕만 paper 60%다.
- **Don't** 카드 안에 테두리 상자를 중첩하지 않는다.
