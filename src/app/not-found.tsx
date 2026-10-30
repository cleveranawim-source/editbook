import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-3 p-4">
      <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-gray-600">주소가 잘못되었거나 볼 수 있는 권한이 없습니다.</p>
      <Link href="/books" className="text-blue-700 underline">
        내 책으로 가기
      </Link>
    </main>
  );
}
