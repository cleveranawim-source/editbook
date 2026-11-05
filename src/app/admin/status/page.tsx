import { requireAdmin } from "@/lib/auth/current";
import { formatBytes } from "@/lib/files";
import { opsSummary } from "@/lib/ops";
import { storageKind } from "@/lib/storage";
import { buttonClass } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";

const when = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export default async function AdminStatusPage() {
  await requireAdmin();
  const s = await opsSummary();
  const storage = storageKind();
  const days = s.daysSinceBackup;
  const rows: [string, number][] = [
    ["계정", s.counts.users],
    ["책", s.counts.books],
    ["파트", s.counts.parts],
    ["원고 버전", s.counts.versions],
    ["수정 요청·질문", s.counts.requests],
    ["자료함 항목", s.counts.materials],
    ["알림", s.counts.notifications],
    ["푸시 켠 기기", s.counts.pushDevices],
  ];
  return (
    <div className="max-w-[880px]">
      <PageHeader title="운영 상태" />
      <div className="flex flex-col gap-7">
        <Card as="section" aria-labelledby="health-heading" className="px-5 py-5 md:px-7">
          <CardTitle id="health-heading">서버</CardTitle>
          <ul className="mt-3 flex flex-col gap-2 text-[15px]">
            <li className="flex items-center gap-2">
              데이터베이스 <StatusBadge tone="green">정상</StatusBadge>
            </li>
            <li className="flex items-center gap-2">
              파일 저장소{" "}
              {storage === "none" ? (
                <StatusBadge tone="red">연결 안 됨</StatusBadge>
              ) : (
                <StatusBadge tone="green">{storage === "blob" ? "Vercel Blob 연결됨" : "이 컴퓨터(.uploads)"}</StatusBadge>
              )}
            </li>
            <li className="text-sm text-ink-2">
              저장소 사용량(기록 기준): 원고 {formatBytes(s.bytes.originals)} · 자료함 {formatBytes(s.bytes.materials)}. 자동 변환
              미리보기 PDF는 따로 더 차지합니다. Vercel 대시보드 Storage에서 정확한 양을 볼 수 있습니다.
            </li>
          </ul>
        </Card>

        <Card as="section" aria-labelledby="counts-heading">
          <CardTitle id="counts-heading" className="px-5 pb-3 pt-5 md:px-7">
            쌓인 기록
          </CardTitle>
          <table className="w-full border-t border-rule text-[15px]">
            <tbody>
              {rows.map(([label, n]) => (
                <tr key={label} className="border-b border-rule last:border-b-0">
                  <th scope="row" className="px-5 py-2.5 text-left font-medium text-ink-2 md:px-7">
                    {label}
                  </th>
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums md:px-7">{n.toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card as="section" aria-labelledby="backup-heading" className="px-5 py-5 md:px-7">
          <CardTitle id="backup-heading">백업</CardTitle>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            계정·책·파트·버전·요청·댓글·자료함 기록 전부와 파일 목록을 JSON 파일 하나로 내려받습니다. 파일 자체는 저장소에 남아
            있고, 백업에는 그 주소와 원래 이름이 들어갑니다. 비밀번호는 암호화된 형태로만 들어 있지만 계정 정보가 담기니 안전한
            곳에 보관하세요.
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            마지막 백업:{" "}
            {s.lastBackupAt ? (
              <>
                <span className="font-bold">{when.format(s.lastBackupAt)}</span>
                {days !== null && days >= 7 && <StatusBadge tone="yellow">{days}일 지남</StatusBadge>}
              </>
            ) : (
              <StatusBadge tone="yellow">아직 없음</StatusBadge>
            )}
          </p>
          <a href="/api/admin/backup" className={`${buttonClass("primary")} mt-4`}>
            지금 백업 내려받기
          </a>
          <p className="mt-3 text-[12.5px] text-ink-3">일주일에 한 번쯤 내려받아 두기를 권합니다.</p>
        </Card>
      </div>
    </div>
  );
}
