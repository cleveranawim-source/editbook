import { requireUser } from "@/lib/auth/current";
import { getVapidKeys, listNotifications } from "@/lib/notify";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { cx } from "@/components/cx";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { markAllReadAction } from "./actions";
import { PushSettings } from "./push-settings";

const when = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export default async function NotificationsPage() {
  const user = await requireUser();
  const [items, { publicKey }] = await Promise.all([listNotifications(user.id), getVapidKeys()]);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="max-w-[880px]">
      <PageHeader title="알림" count={unread > 0 ? `안 읽음 ${unread}` : undefined} />
      <div className="flex flex-col gap-7">
        <Card as="section" aria-labelledby="list-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 pt-5 md:px-7">
            <CardTitle id="list-heading" count={`${items.length}개`}>
              최근 알림
            </CardTitle>
            {unread > 0 && (
              <form action={markAllReadAction}>
                <Button type="submit" variant="quiet" size="sm">
                  모두 읽음으로
                </Button>
              </form>
            )}
          </div>
          {items.length === 0 ? (
            <EmptyState variant="inline">아직 알림이 없습니다. 요청·답글·확인이 생기면 여기에 쌓입니다.</EmptyState>
          ) : (
            <ul className="border-t border-rule">
              {items.map((n) => (
                <li key={n.id} className="border-b border-rule last:border-b-0">
                  <a
                    href={`/notifications/${n.id}`}
                    className={cx(
                      "flex gap-3 px-5 py-3.5 no-underline transition-colors hover:bg-rb-tint md:px-7",
                      !n.readAt && "bg-mine",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cx("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-st-red")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cx("block leading-snug text-ink", !n.readAt && "font-bold")}>
                        {!n.readAt && <span className="sr-only">안 읽음 </span>}
                        {n.title}
                      </span>
                      {n.body && <span className="mt-0.5 block truncate text-sm text-ink-2">{n.body}</span>}
                    </span>
                    <span className="shrink-0 text-[12.5px] text-ink-3">{when.format(n.createdAt)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card as="section" aria-labelledby="push-heading" className="px-5 py-5 md:px-7">
          <CardTitle id="push-heading">휴대폰·컴퓨터 알림</CardTitle>
          <p className="mb-4 mt-2 text-sm leading-relaxed text-ink-2">
            켜 두면 사이트를 닫아 두어도 요청·답글·확인이 생길 때 이 기기로 알림이 옵니다. 기기마다 따로 켭니다.
          </p>
          <PushSettings publicKey={publicKey} />
        </Card>
      </div>
    </div>
  );
}
