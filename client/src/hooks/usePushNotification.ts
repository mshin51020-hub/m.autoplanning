import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export interface PushNotificationState {
  isSupported:  boolean;
  isEnabled:    boolean;
  isLoading:    boolean;
  permission:   NotificationPermission;
  enable:  () => Promise<void>;
  disable: () => Promise<void>;
}

export function usePushNotification(): PushNotificationState {
  const { isAuthenticated } = useAuth();
  const [isEnabled,  setIsEnabled]  = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const { data: vapidData } = trpc.push.vapidPublicKey.useQuery(undefined, {
    enabled: isSupported && isAuthenticated,
    staleTime: Infinity,
  });

  const subscribeMutation   = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // 現在の購読状態を確認
  useEffect(() => {
    if (!isSupported || !isAuthenticated) return;
    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsEnabled(!!sub);
      });
    }).catch(() => {});
  }, [isSupported, isAuthenticated]);

  async function enable() {
    if (!isSupported || !vapidData?.key) return;
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.key).buffer as ArrayBuffer,
      });

      const json = sub.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: json.endpoint!,
        p256dh:   json.keys!.p256dh,
        auth:     json.keys!.auth,
      });
      setIsEnabled(true);
    } catch (e) {
      console.error("[Push] Subscribe failed:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function disable() {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unsubscribeMutation.mutateAsync({ endpoint });
      }
      setIsEnabled(false);
    } catch (e) {
      console.error("[Push] Unsubscribe failed:", e);
    } finally {
      setIsLoading(false);
    }
  }

  return { isSupported, isEnabled, isLoading, permission, enable, disable };
}
