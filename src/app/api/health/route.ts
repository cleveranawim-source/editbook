import { prisma } from "@/lib/db";
import { ensureAdminFromEnv } from "@/lib/startup";
import { blobUploadMode, storageKind } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** 배포 상태 확인용. 비밀은 담지 않는다. */
export async function GET() {
  const out: Record<string, unknown> = {
    ok: false,
    db: "unknown",
    admin: false,
    adminEnv: Boolean(process.env.ADMIN_PASSWORD),
    storage: storageKind() === "blob" ? `blob(${blobUploadMode()})` : storageKind(),
    dbConnection: process.env.DATABASE_URL_POOLED ? "pooled" : "direct",
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
