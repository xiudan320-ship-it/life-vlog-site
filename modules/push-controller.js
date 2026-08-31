const SUBSCRIPTION_SYNC_KEY = "life-vlog-push-subscription-sync";
const SUBSCRIPTION_SYNC_INTERVAL = 6 * 60 * 60 * 1000;

function decodeVapidPublicKey(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function supportsWebPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isStandaloneWebApp() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function createPushController({
  elements,
  request,
  notificationRepository,
  diaryRepository,
  getSession,
  getDatabase,
  getPhotos,
  prependPhoto,
  loadNotifications,
  openNotificationsPanel,
  setActiveSettingsSection,
  switchPage,
  openPhoto,
  showToast,
}) {
  let syncPromise = null;
  let pushOperationPromise = null;

  function registerWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!["https:", "http:"].includes(window.location.protocol)) return;
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
  }

  async function getSubscription() {
    if (!supportsWebPush()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }

  async function syncExistingSubscription({ force = false } = {}) {
    const session = getSession();
    if (!session || !supportsWebPush() || Notification.permission !== "granted") return false;
    if (syncPromise) return syncPromise;
    const storageKey = `${SUBSCRIPTION_SYNC_KEY}:${session.user.id}`;
    const lastSync = Number(localStorage.getItem(storageKey) || 0);
    if (!force && Date.now() - lastSync < SUBSCRIPTION_SYNC_INTERVAL) return true;

    syncPromise = (async () => {
      const subscription = await getSubscription();
      if (!subscription) return false;
      await request("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      localStorage.setItem(storageKey, String(Date.now()));
      return true;
    })()
      .catch(() => false)
      .finally(() => {
        syncPromise = null;
      });
    return syncPromise;
  }

  async function refreshSettings() {
    const state = document.querySelector("#pushNotificationState");
    const detail = document.querySelector("#pushNotificationDetail");
    const enable = document.querySelector("#enablePushNotifications");
    const disable = document.querySelector("#disablePushNotifications");
    if (!state || !enable || !disable) return;
    if (!supportsWebPush()) {
      state.textContent = "当前设备不支持";
      detail.textContent = "请使用 iOS 16.4+ 主屏幕 Web App 或现代浏览器。";
      enable.disabled = true;
      disable.disabled = true;
      disable.hidden = true;
      return;
    }
    const subscription = await getSubscription().catch(() => null);
    const enabled = Notification.permission === "granted" && Boolean(subscription);
    state.textContent = enabled ? "已开启" : Notification.permission === "denied" ? "已被系统关闭" : "未开启";
    detail.textContent = enabled
      ? "新日记、评论、回复和感谢留言会发送到这台设备。"
      : (/(iPhone|iPad|iPod)/i.test(navigator.userAgent) && !isStandaloneWebApp())
        ? "请先添加到主屏幕，再从桌面图标打开并开启。"
        : "开启后，即使没有打开页面也能收到家庭消息。";
    enable.hidden = enabled;
    enable.disabled = Notification.permission === "denied";
    disable.disabled = false;
    disable.hidden = !enabled;
  }

  function setOperationBusy(busy) {
    const enable = document.querySelector("#enablePushNotifications");
    const disable = document.querySelector("#disablePushNotifications");
    [enable, disable].forEach((button) => {
      if (!button) return;
      if (busy) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
      } else {
        button.removeAttribute("aria-busy");
      }
    });
  }

  function runPushOperation(task) {
    if (pushOperationPromise) return pushOperationPromise;
    setOperationBusy(true);
    pushOperationPromise = Promise.resolve()
      .then(task)
      .catch((error) => {
        const status = document.querySelector("#pushNotificationStatus");
        if (status) status.textContent = `操作失败：${error?.message || "请重试"}`;
        return false;
      })
      .finally(async () => {
        await refreshSettings().catch(() => {});
        setOperationBusy(false);
        pushOperationPromise = null;
      });
    return pushOperationPromise;
  }

  function enable() {
    const session = getSession();
    if (!session || !supportsWebPush()) return;
    const status = document.querySelector("#pushNotificationStatus");
    if (/(iPhone|iPad|iPod)/i.test(navigator.userAgent) && !isStandaloneWebApp()) {
      if (status) status.textContent = "请先把咻蛋之家添加到主屏幕，再从桌面图标打开。";
      return;
    }
    return runPushOperation(async () => {
      if (status) status.textContent = "正在向系统申请通知权限...";
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (status) status.textContent = "没有获得通知权限，可在系统设置中重新允许。";
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const config = await request("/api/push/config");
      const publicKey = String(config?.data?.publicKey || "");
      if (!publicKey) throw new Error("推送公钥尚未部署");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(publicKey),
        });
      }
      await request("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      localStorage.setItem(`${SUBSCRIPTION_SYNC_KEY}:${session.user.id}`, String(Date.now()));
      if (status) status.textContent = "通知已开启，这台设备会收到家庭新消息。";
      showToast("通知已开启", { kind: "success", placement: "center" });
      return true;
    });
  }

  function disable() {
    return runPushOperation(async () => {
      const status = document.querySelector("#pushNotificationStatus");
      if (status) status.textContent = "正在关闭这台设备的通知…";
      let subscription = null;
      let localError = null;
      let remoteError = null;
      try {
        subscription = await getSubscription();
      } catch (error) {
        localError = error;
      }

      const endpoint = String(subscription?.endpoint || "");
      if (subscription) {
        try {
          await subscription.unsubscribe();
        } catch (error) {
          localError = error;
        }
      }
      if (navigator.clearAppBadge) await navigator.clearAppBadge().catch(() => {});
      if (endpoint) {
        try {
          await request("/api/push/unsubscribe", {
            method: "POST",
            body: JSON.stringify({ endpoint }),
          });
        } catch (error) {
          remoteError = error;
        }
      }

      const remainingSubscription = await getSubscription().catch(() => null);
      if (localError || remainingSubscription) {
        if (status) status.textContent = `关闭失败：${localError?.message || "本机订阅仍然存在"}`;
        return false;
      }
      if (remoteError) {
        if (status) status.textContent = "本机已关闭，云端记录清理失败，可联网后重试。";
        return false;
      }
      if (status) status.textContent = "这台设备的通知已关闭。";
      return true;
    });
  }

  function ensureSettingsPage() {
    const group = document.querySelector("#settingsNotifications");
    if (!group || group.dataset.pushUiBound === "true") return;
    group.dataset.pushUiBound = "true";
    group.querySelector("#enablePushNotifications")?.addEventListener("click", enable);
    group.querySelector("#disablePushNotifications")?.addEventListener("click", disable);
  }

  async function openDestination(data = {}) {
    if (!getSession()) return;
    const params = new URLSearchParams(location.search);
    const photoId = String(data.photoId || params.get("pushPhoto") || "");
    const type = String(data.type || params.get("pushType") || "");
    if (data.notificationId && getDatabase()) {
      await notificationRepository.markRead(data.notificationId);
      void loadNotifications();
    }
    if (photoId) {
      let photo = getPhotos().find((item) => item.id === photoId);
      if (!photo && getDatabase()) {
        const { data: fetched } = await diaryRepository.getById(photoId);
        photo = fetched || null;
        if (photo && !getPhotos().some((item) => item.id === photo.id)) prependPhoto(photo);
      }
      if (photo) {
        switchPage("gallery");
        requestAnimationFrame(() => openPhoto(photo));
      }
    } else if (type === "thanks") {
      switchPage("thanks");
    } else {
      await openNotificationsPanel();
    }
    if (location.search.includes("push")) {
      const cleaned = new URL(location.href);
      cleaned.searchParams.delete("pushPhoto");
      cleaned.searchParams.delete("pushType");
      cleaned.searchParams.delete("notificationId");
      history.replaceState({}, "", `${cleaned.pathname}${cleaned.search}${cleaned.hash}`);
    }
  }

  return {
    disable,
    enable,
    ensureSettingsPage,
    openDestination,
    refreshSettings,
    registerWorker,
    syncExistingSubscription,
  };
}
