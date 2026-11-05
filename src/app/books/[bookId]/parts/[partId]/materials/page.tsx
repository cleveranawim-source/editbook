import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { isImageMaterial, listMaterials } from "@/lib/materials";
import { listRequestViews, perspectiveOf } from "@/lib/requests";
import { blobUploadMode, fileUrl, isLocalRef, storageKind } from "@/lib/storage";
import { getPartForViewer } from "@/lib/versions";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/Card";
import { PartTabs } from "../part-tabs";
import { MaterialsPanel, type MaterialView } from "./materials-panel";

/** 서버를 거쳐 내려받으면 원래 이름이 붙지만 함수 시간 제한이 있어, 큰 파일은 저장소에서 바로 받는다. */
const PROXY_LIMIT = 50 * 1024 * 1024;

export default async function MaterialsPage({ params }: { params: Promise<{ bookId: string; partId: string }> }) {
  const { bookId, partId } = await params;
  const user = await requireUser();
  const found = await getPartForViewer(partId, user);
  if (!found || found.part.bookId !== bookId) notFound();
  const { part, book } = found;
  const perspective = perspectiveOf(user, found);
  const [rows, requests] = await Promise.all([listMaterials(partId), listRequestViews(partId)]);
  const active = book.status === "ACTIVE";
  const items: MaterialView[] = rows.map((m) => {
    const size = m.size === null ? null : Number(m.size);
    const big = size !== null && size > PROXY_LIMIT && m.ref !== null && !isLocalRef(m.ref);
    return {
      id: m.id,
      kind: m.kind,
      title: m.title,
      note: m.note,
      size,
      isImage: isImageMaterial(m),
      viewUrl: m.ref ? fileUrl(m.ref) : null,
      thumbUrl: m.thumbRef ? fileUrl(m.thumbRef) : null,
      downloadUrl: m.ref ? (big ? `${m.ref}?download=1` : fileUrl(m.ref, { download: true })) : null,
      linkUrl: m.url,
      uploaderName: m.uploadedBy?.name ?? "알 수 없음",
      createdAt: m.createdAt.toISOString(),
      canDelete: active && (perspective === "editor" || m.uploadedById === user.id),
    };
  });

  return (
    <div className="flex flex-col gap-7">
      <BackLink href={`/books/${book.id}`} className="-mb-5 -mt-2 self-start">
        {book.title}
      </BackLink>
      <Card as="header" className="px-5 py-5 md:px-7">
        <p className="font-serif text-[22px] font-black leading-none text-rb">
          <span className="sr-only">순서 </span>
          {part.order}
        </p>
        <h1 className="mt-1 font-serif text-[28px] font-black leading-[1.2] tracking-[-0.015em] md:text-[32px]">{part.title}</h1>
        <p className="mt-2 text-sm text-ink-2">담당 {part.assignee?.name ?? "없음"}</p>
      </Card>
      <PartTabs
        bookId={book.id}
        partId={part.id}
        active="materials"
        materialCount={rows.length}
        openRequests={requests.filter((r) => r.status === "OPEN" || r.status === "RESPONDED").length}
      />
      <MaterialsPanel
        partId={part.id}
        items={items}
        canAdd={active && perspective !== "other"}
        storage={storageKind()}
        blobMode={blobUploadMode()}
      />
    </div>
  );
}
