import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/current";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Tag";

// 한글 글리프는 unicode-range 조각으로 필요할 때 받는다. 미리 받는 것은 latin뿐.
const serif = Noto_Serif_KR({
  weight: ["700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-serif-kr",
});
const sans = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "EditBook",
  description: "교과서 공동 편집실",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="ko" className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-10 bg-ink px-4 py-3 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-2"
        >
          본문으로 건너뛰기
        </a>
        <header className="h-[58px] shrink-0 border-b-2 border-rb bg-paper">
          <div className="mx-auto flex h-full w-full max-w-[1408px] items-center justify-between gap-4 px-4 md:px-8">
            <Link
              href="/books"
              className="-mx-1 flex min-h-11 items-center gap-2.5 px-1 font-serif text-[22px] font-black leading-none tracking-[0.01em] text-ink no-underline"
            >
              <span aria-hidden className="brand-mark" />
              EditBook
            </Link>
            {user && (
              <div className="flex min-w-0 items-center gap-3">
                <span className="min-w-0 truncate text-[15px] font-bold">{user.name}</span>
                {/* 역할은 책마다 다르지만 관리자는 전역 역할이라 여기서 알 수 있다. 360px에선 이름을 지키려 숨긴다. */}
                {user.isAdmin && <Tag className="-ml-1 hidden sm:inline-flex">관리자</Tag>}
                <form action={logoutAction} className="shrink-0">
                  <Button type="submit" variant="quiet" size="sm">
                    로그아웃
                  </Button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1408px] flex-1 px-4 pb-14 pt-7 md:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
