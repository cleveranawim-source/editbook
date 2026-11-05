import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { extensionOf, formatBytes } from "@/lib/files";
import { computePartStatus, viewerTone, viewerTurn } from "@/lib/part-status";
import { canEditPart } from "@/lib/permissions";
import { isClosed } from "@/lib/request-view";
import { listRequestViews, perspectiveOf } from "@/lib/requests";
import { blobUploadMode, fileUrl, storageKind } from "@/lib/storage";
import { getPartForViewer, listVersions, type VersionRow } from "@/lib/versions";
import { BackLink } from "@/components/BackLink";
import { buttonClass } from "@/components/Button";
import { Card, CardBand, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { TurnTag } from "@/components/Tag";
import { HwpViewer } from "./hwp-viewer";
import { PartTabs } from "./part-tabs";
import { materialCount } from "@/lib/materials";
import { PartWorkspace } from "./part-workspace";
import { CompletePartButton, DeleteVersionButton } from "./small-actions";
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
  searchParams: Promise<{ v?: string; r?: string }>;
}) {
  const [{ bookId, partId }, { v, r }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const found = await getPartForViewer(partId, user);
  if (!found || found.part.bookId !== bookId) notFound();
  const { part, book, role } = found;
  const [versions, requests, materials] = await Promise.all([listVersions(partId), listRequestViews(partId), materialCount(partId)]);
  const wanted = v ? Number(v) : NaN;
  const current = versions.find((x) => x.number === wanted) ?? versions[0];
  const latest = versions[0];
  const active = book.status === "ACTIVE";
  const canUpload = canEditPart(user, role, book.status, part);
  const perspective = perspectiveOf(user, found);
  const completed = Boolean(latest && part.completedVersionId === latest.id);
  const status = computePartStatus({
    hasVersion: versions.length > 0,
    openRequests: requests.filter((x) => x.kind === "REQUEST" && x.status === "OPEN").length,
    awaitingReview: requests.filter((x) => !isClosed(x.status) && !(x.kind === "REQUEST" && x.status === "OPEN")).length,
    completed,
  });
  const turn = viewerTurn(status.kind, perspective);
  const storage = storageKind();
  const requestsByVersion = new Map<string, number>();
  for (const x of requests) requestsByVersion.set(x.versionId, (requestsByVersion.get(x.versionId) ?? 0) + 1);
  const openRequests = requests
    .filter((x) => x.kind === "REQUEST" && x.status === "OPEN")
    .map((x) => ({ id: x.id, number: x.number, body: x.body }));

  const fallback = !current ? (
    <EmptyState variant="inline">
      {canUpload
        ? "아직 올린 원고가 없습니다. 오른쪽에서 첫 원고를 올리세요."
        : "아직 올린 원고가 없습니다. 담당 선생님이 올리면 여기서 볼 수 있습니다."}
    </EmptyState>
  ) : ["hwp", "hwpx"].includes(extensionOf(current.originalName)) ? (
    <>
      <HwpViewer key={current.id} url={fileUrl(current.originalRef)} label={`v${current.number} 간이 미리보기`} />
      <p className="border-t border-rule px-4 py-2 text-[13px] text-ink-2">
        이 버전에는 미리보기 PDF가 없어 수정 요청을 표시할 수 없습니다. 새 버전을 올리면 PDF가 자동으로 만들어집니다.
      </p>
    </>
  ) : (
    <EmptyState variant="inline">
      v{current.number}에는 미리보기용 PDF가 없습니다. 원본을 내려받아 열어 보세요.
      {canUpload && " 다음 버전부터는 워드에서 PDF로 저장한 파일을 함께 올리면 여기서 바로 보이고 요청도 표시할 수 있습니다."}
    </EmptyState>
  );

  const side = (
    <>
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
              <UploadForm partId={part.id} storage={storage} blobMode={blobUploadMode()} openRequests={openRequests} />
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
              <VersionItem
                key={x.id}
                version={x}
                current={x.id === current?.id}
                canDelete={active && perspective === "editor"}
                requestCount={requestsByVersion.get(x.id) ?? 0}
              />
            ))}
          </ul>
        )}
        {!canUpload && active && (
          <CardBand title="원고 올리기">
            <p className="text-sm text-ink-2">이 파트의 담당 선생님과 편집장만 새 버전을 올릴 수 있습니다.</p>
          </CardBand>
        )}
      </Card>
    </>
  );

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
            {turn === "mine" && <TurnTag kind="turn" />}
            {part.assigneeUserId === user.id && <TurnTag kind="mine" />}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span>담당 {part.assignee?.name ?? "없음"}</span>
            {part.note && <span>{part.note}</span>}
            <StatusBadge tone={viewerTone(status, turn)}>{status.label}</StatusBadge>
            {book.status === "ARCHIVED" && <StatusBadge tone="gray">보관됨</StatusBadge>}
          </p>
        </div>
        {current && (
          <div className="flex shrink-0 flex-wrap items-start gap-2">
            <VersionSelect
              versions={versions.map((x) => ({ number: x.number, label: `v${x.number} · ${when.format(x.createdAt)}` }))}
              current={current.number}
            />
            {/* 파일 내려받기는 페이지 이동이 아니므로 next/link가 아닌 일반 a(미리 불러오기 없음) */}
            <a href={fileUrl(current.originalRef, { download: true })} className={buttonClass("secondary")}>
              원본 내려받기
            </a>
            {versions.filter((x) => x.pdfRef).length >= 2 && (
              <a href={`/books/${book.id}/parts/${part.id}/compare`} className={buttonClass("quiet")}>
                두 버전 비교
              </a>
            )}
            {active && perspective === "editor" && <CompletePartButton partId={part.id} completed={completed} />}
          </div>
        )}
      </Card>

      <PartTabs
        bookId={book.id}
        partId={part.id}
        active="manuscript"
        materialCount={materials}
        openRequests={requests.filter((x) => !isClosed(x.status)).length}
      />

      <PartWorkspace
        partId={part.id}
        version={current ? { id: current.id, number: current.number } : null}
        pdfUrl={current?.pdfRef ? fileUrl(current.pdfRef) : null}
        requests={requests}
        perspective={perspective}
        canWrite={active}
        initialSelectedId={r}
        fallback={fallback}
        side={side}
        upload={storage === "none" ? null : { partId: part.id, storage, blobMode: blobUploadMode() }}
      />
    </div>
  );
}

function VersionItem({
  version: x,
  current,
  canDelete,
  requestCount,
}: {
  version: VersionRow;
  current: boolean;
  canDelete: boolean;
  requestCount: number;
}) {
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
        {requestCount > 0 && <span>요청 {requestCount}개</span>}
      </p>
      {canDelete && (
        <DeleteVersionButton
          versionId={x.id}
          number={x.number}
          blockedReason={requestCount > 0 ? "요청이 달린 버전은 지울 수 없습니다." : undefined}
        />
      )}
    </li>
  );
}
