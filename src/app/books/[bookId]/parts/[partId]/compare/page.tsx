import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { fileUrl } from "@/lib/storage";
import { getPartForViewer, listVersions } from "@/lib/versions";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PdfViewer } from "../pdf-viewer";
import { CompareSelect } from "./compare-select";

/** 두 버전을 나란히 펼쳐 본다(미리보기 PDF가 있는 버전끼리). 휴대폰에서는 위아래로. */
export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string; partId: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const [{ bookId, partId }, { a, b }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const found = await getPartForViewer(partId, user);
  if (!found || found.part.bookId !== bookId) notFound();
  const { part, book } = found;
  const versions = (await listVersions(partId)).filter((v) => v.pdfRef);
  const pick = (n: string | undefined, fallback: number) => versions.find((v) => v.number === Number(n)) ?? versions[fallback];
  const right = pick(b, 0);
  const left = pick(a, 1) ?? right;
  const options = versions.map((v) => ({ number: v.number, label: `v${v.number}${v.note ? ` · ${v.note.slice(0, 20)}` : ""}` }));

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/books/${book.id}/parts/${part.id}`} className="-mb-4 -mt-2 self-start">
        {part.title}
      </BackLink>
      <h1 className="font-serif text-[28px] font-black leading-[1.2]">두 버전 비교</h1>
      {versions.length < 2 || !left || !right ? (
        <EmptyState>미리보기 PDF가 있는 버전이 두 개 이상이어야 비교할 수 있습니다.</EmptyState>
      ) : (
        <>
          <CompareSelect options={options} a={left.number} b={right.number} />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Card className="min-w-0">
              <PdfViewer key={`a-${left.id}`} url={fileUrl(left.pdfRef!)} label={`v${left.number} (앞)`} />
            </Card>
            <Card className="min-w-0">
              <PdfViewer key={`b-${right.id}`} url={fileUrl(right.pdfRef!)} label={`v${right.number} (뒤)`} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
