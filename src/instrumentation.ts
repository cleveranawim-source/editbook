export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureAdminFromEnv } = await import("@/lib/startup");
    console.log("[editbook] 시작:", await ensureAdminFromEnv());
  } catch (e) {
    console.error("[editbook] 시작 시 관리자 보장 실패:", e);
  }
}
