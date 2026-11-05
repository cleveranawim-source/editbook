import { getCurrentUser } from "@/lib/auth/current";
import { backupJson, buildBackup } from "@/lib/ops";

export const dynamic = "force-dynamic";

/** 관리자만: 전체 기록을 JSON 파일 하나로 내려받는다. */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user?.isAdmin || user.mustChangePassword) return new Response("관리자만 내려받을 수 있습니다.", { status: 403 });
  const data = await buildBackup();
  const stamp = data.takenAt.slice(0, 16).replace(/[:T]/g, "-");
  return new Response(backupJson(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="editbook-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
