-- 로그인 아이디를 소문자로 통일한다(앱도 입력을 소문자로 정규화함).
UPDATE "User" SET "loginId" = lower("loginId") WHERE "loginId" <> lower("loginId");
