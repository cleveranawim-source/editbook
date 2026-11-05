"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { InlineError } from "@/components/Field";
import { subscribePushAction, testPushAction, unsubscribePushAction } from "./actions";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Support = "checking" | "ok" | "ios-install" | "unsupported" | "denied";

/** 이 기기에서 푸시 알림 켜기·끄기. iOS는 홈 화면에 설치한 앱에서만 된다. */
export function PushSettings({ publicKey }: { publicKey: string }) {
  const router = useRouter();
  const [support, setSupport] = useState<Support>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setSupport(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") setSupport("denied");
      else setSupport("ok");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(Boolean(sub));
    })().catch(() => setSupport("unsupported"));
  }, []);

  function turnOn() {
    setError(undefined);
    setMessage(undefined);
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setSupport(permission === "denied" ? "denied" : "ok");
          setError("알림 권한을 허용해야 받을 수 있습니다.");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const res = await subscribePushAction(json);
        if (!res.ok) throw new Error(res.error);
        setSubscribed(true);
        setMessage("이 기기에서 알림을 받습니다.");
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "알림을 켜지 못했습니다.");
      }
    });
  }

  function turnOff() {
    setError(undefined);
    setMessage(undefined);
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMessage("이 기기에서는 알림을 받지 않습니다.");
    });
  }

  if (support === "checking") return <p className="text-sm text-ink-2">이 기기를 확인하는 중…</p>;
  if (support === "ios-install")
    return (
      <div className="text-sm leading-relaxed">
        <p className="font-bold">아이폰·아이패드는 홈 화면에 설치한 뒤에 알림을 받을 수 있습니다.</p>
        <ol className="mt-2 list-decimal pl-5 text-ink-2">
          <li>사파리 아래쪽 [공유] 버튼을 누릅니다.</li>
          <li>[홈 화면에 추가]를 누릅니다.</li>
          <li>홈 화면의 EditBook 아이콘으로 다시 열고, 이 화면에서 알림을 켭니다.</li>
        </ol>
      </div>
    );
  if (support === "unsupported")
    return <p className="text-sm text-ink-2">이 브라우저는 푸시 알림을 지원하지 않습니다. 크롬·엣지·사파리 최신판에서 열어 주세요.</p>;

  return (
    <div className="flex flex-col gap-3">
      {support === "denied" && (
        <p className="text-sm text-st-red-fg">
          이 브라우저에서 EditBook 알림이 차단되어 있습니다. 주소창 왼쪽 자물쇠 → 알림을 [허용]으로 바꾼 뒤 다시 켜세요.
        </p>
      )}
      <p className="text-sm">
        {subscribed ? "이 기기에서 알림을 받고 있습니다." : "이 기기에서는 아직 알림을 받지 않습니다."}
      </p>
      <div className="flex flex-wrap gap-2">
        {subscribed ? (
          <>
            <Button variant="secondary" pending={pending} onClick={turnOff}>
              이 기기 알림 끄기
            </Button>
            <Button
              variant="quiet"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await testPushAction();
                  setMessage("시험 알림을 보냈습니다.");
                  router.refresh();
                })
              }
            >
              시험 알림 보내기
            </Button>
          </>
        ) : (
          <Button variant="primary" pending={pending} onClick={turnOn} disabled={support === "denied"}>
            이 기기에서 알림 받기
          </Button>
        )}
      </div>
      {message && <p className="text-sm text-st-green">{message}</p>}
      <InlineError message={error} />
    </div>
  );
}
