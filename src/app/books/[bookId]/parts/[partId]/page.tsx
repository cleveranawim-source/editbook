import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { extensionOf, formatBytes } from "@/lib/files";
import { computePartStatus } from "@/lib/part-status";
import { canEditPart } from "@/lib/permissions";
import { fileUrl, storageKind } from "@/lib/storage";
import { getPartForViewer, listVersions, type VersionRow } from "@/lib/versions";
import { BackLink } from "@/components/BackLink";
import { ButtonLink } from "@/components/Button";
import { Card, CardBand, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { TurnTag } from "@/components/Tag";
import { HwpViewer } from "./hwp-viewer";
import { PdfViewer } from "./pdf-viewer";
import { UploadForm } from "./upload-form";
import { VersionSelect } from "./version-select";

const when = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export default async function PartPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string; partId: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const [{ bookId, partId }, { v }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const found = await getPartForViewer(partId, user);
  if (!found || found.part.bookId !== bookId) notFound();
  const { part, book, role } = found;
  const versions = await listVersions(partId);
  const wanted = v ? Number(v) : NaN;
  const current = versions.find((x) => x.number === wanted) ?? versions[0];
  const canUpload = canEditPart(user, role, book.status, part);
  const status = computePartStatus({
    hasVersion: versions.length > 0,
    openRequests: 0,
    awaitingReview: 0,
    completed: false,
  });
  const storage = storageKind();

  return (
    <div className="flex flex-col gap-7">
      <BackLink href={`/books/${book.id}`} className="-mb-5 -mt-2 self-start">
        {book.title}
      </BackLink>

      <Card as="header" className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between md:px-7">
        <div className="min-w-0">
          <p className="font-serif text-[22px] font-black leading-none text-rb">
            <span className="sr-only">순서 </span>
            {part.order}
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 font-serif text-[28px] font-black leading-[1.2] tracking-[-0.015em] md:text-[32px]">
            {part.title}
            {part.assigneeUserId === user.id && <TurnTag kind="mine" />}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span>담당 {part.assignee?.name ?? "없음"}</span>
            {part.note && <span>{part.note}</span>}
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {book.status === "ARCHIVED" && <StatusBadge tone="gray">보관됨</StatusBadge>}
          </p>
        </div>
        {current && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <VersionSelect
              versions={versions.map((x) => ({ number: x.number, label: `v${x.number} · ${when.format(x.createdAt)}` }))}
              current={current.number}
            />
            <ButtonLink href={fileUrl(current.originalRef, { download: true })} variant="secondary">
              원본 내려받기
            </ButtonLink>
          </div>
        )}
      </Card>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0">
          {!current ? (
            <EmptyState variant="inline">
              {canUpload
                ? "아직 올린 원고가 없습니다. 오른쪽에서 첫 원고를 올리세요."
                : "아직 올린 원고가 없습니다. 담당 선생님이 올리면 여기서 볼 수 있습니다."}
            </EmptyState>
          ) : current.pdfRef ? (
            <PdfViewer key={current.id} url={fileUrl(current.pdfRef)} label={`v${current.number} 미리보기`} />
          ) : ["hwp", "hwpx"].includes(extensionOf(current.originalName)) ? (
            <HwpViewer key={current.id} url={fileUrl(current.originalRef)} label={`v${current.number} 간이 미리보기`} />
          ) : (
            <EmptyState variant="inline">
              v{current.number}에는 미리보기용 PDF가 없습니다. 원본을 내려받아 열어 보세요.
              {canUpload && " 다음 버전부터는 한글·워드에서 PDF로 저장한 파일을 함께 올리면 여기서 바로 보입니다."}
            </EmptyState>
          )}
        </Card>

        <div className="flex flex-col gap-7">
          {canUpload && (
            <Card as="section" aria-labelledby="upload-heading">
              <CardTitle id="upload-heading" className="px-5 pb-4 pt-5">
                새 버전 올리기
              </CardTitle>
              <div className="border-t border-rule px-5 py-5">
                {storage === "none" ? (
                  <p className="text-sm leading-relaxed text-ink-2">
                    파일 저장소가 아직 연결되지 않았습니다. 관리자가 Vercel 프로젝트의 Storage에서 Blob 저장소를 만들어
                    연결하면 올릴 수 있습니다.
                  </p>
                ) : (
                  <UploadForm partId={part.id} storage={storage} />
                )}
              </div>
            </Card>
          )}

          <Card as="section" aria-labelledby="versions-heading">
            <CardTitle id="versions-heading" count={`${versions.length}개`} className="px-5 pb-4 pt-5">
              버전
            </CardTitle>
            {versions.length === 0 ? (
              <EmptyState variant="inline">아직 버전이 없습니다.</EmptyState>
            ) : (
              <ul className="border-t border-rule">
                {versions.map((x) => (
                  <VersionItem key={x.id} version={x} current={x.id === current?.id} />
                ))}
              </ul>
            )}
            {!canUpload && book.status === "ACTIVE" && (
              <CardBand title="원고 올리기">
                <p className="text-sm text-ink-2">이 파트의 담당 선생님과 편집장만 새 버전을 올릴 수 있습니다.</p>
              </CardBand>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function VersionItem({ version: x, current }: { version: VersionRow; current: boolean }) {
  return (
    <li className={`flex flex-col gap-1.5 border-b border-rule px-5 py-4 last:border-b-0 ${current ? "bg-rb-tint" : ""}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <a href={`?v=${x.number}`} className="font-serif text-lg font-black text-rb no-underline hover:underline">
          v{x.number}
        </a>
        <span className="text-sm font-bold">{x.uploadedBy?.name ?? "알 수 없음"}</span>
        <span className="text-[13px] text-ink-2">{when.format(x.createdAt)}</span>
      </div>
      {x.note && <p className="text-sm">{x.note}</p>}
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-2">
        <a href={fileUrl(x.originalRef, { download: true })} className="text-ink underline">
          {x.originalName}
        </a>
        <span>{formatBytes(x.originalSize)}</span>
        {x.pdfRef && x.pdfRef !== x.originalRef && (
          <a href={fileUrl(x.pdfRef, { download: true })} className="text-ink underline">
            미리보기 PDF
          </a>
        )}
        {!x.pdfRef && <span className="text-st-amber-fg">미리보기 없음</span>}
      </p>
    </li>
  );
}
