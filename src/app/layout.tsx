import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/current";
import { logoutAction } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "EditBook",
  description: "교과서 공동 편집실",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-2">
          <Link href="/books" className="font-bold">
            EditBook
          </Link>
          {user && (
            <div className="flex items-center gap-2 text-sm">
              <span className="truncate">{user.name}</span>
              <form action={logoutAction}>
                <button type="submit" className="rounded border border-gray-300 px-2 py-1">
                  로그아웃
                </button>
              </form>
            </div>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
