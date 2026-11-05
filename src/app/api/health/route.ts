import { prisma } from "@/lib/db";
import { ensureAdminFromEnv } from "@/lib/startup";
import { blobUploadMode, storageKind } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** 배포 상태 확인용. 비밀은 담지 않는다. ?deep=1 이면 동시 질의 12개를 보내 연결 문제를 드러낸다. */
export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("deep") === "1") {
    const started = Date.now();
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => prisma.user.count()));
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)).split("\n").slice(-2).join(" ").slice(0, 300));
    return Response.json({
      ok: errors.length === 0,
      failed: errors.length,
      ms: Date.now() - started,
      errors: Array.from(new Set(errors)),
      dbUrlKind: process.env.DATABASE_URL_POOLED ? "pooled-available" : "direct-only",
    });
  }
  const out: Record<string, unknown> = {
    ok: false,
    db: "unknown",
    admin: false,
    adminEnv: Boolean(process.env.ADMIN_PASSWORD),
    storage: storageKind() === "blob" ? `blob(${blobUploadMode()})` : storageKind(),
  };
  try {
    out.startup = await ensureAdminFromEnv();
    out.admin = (await prisma.user.count({ where: { isAdmin: true } })) > 0;
    out.db = "ok";
    out.ok = true;
  } catch (e) {
    out.db = "error";
    out.error = e instanceof Error ? e.message.split("\n")[0].slice(0, 200) : String(e);
  }
  return Response.json(out, { status: out.ok ? 200 : 503 });
}
