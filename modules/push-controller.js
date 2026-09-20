const SUBSCRIPTION_SYNC_KEY = "life-vlog-push-subscription-sync";
const SUBSCRIPTION_SYNC_INTERVAL = 6 * 60 * 60 * 1000;
const SERVICE_WORKER_READY_TIMEOUT_MS = 5000;

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
  switchPage,
  openThanksDialog,
  openWishlistDestination = () => {},
  openPhoto,
  showToast,
  readyTimeoutMs = SERVICE_WORKER_READY_TIMEOUT_MS,
}) {
  let syncPromise = null;
  let pushOperationPromise = null;
  let settingsRefreshGeneration = 0;

  function registerWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!["https:", "http:"].includes(window.location.protocol)) return;
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
  }

  async function getServiceWorkerReady() {
    const ready = navigator.serviceWorker?.ready;
    if (!ready) throw new Error("Service Worker 尚未注册");
    let timeoutId = 0;
    const timeout = new Promise((_, reject) => {
      timeoutId = globalThis.setTimeout(() => {
        const error = new Error("Service Worker 尚未就绪");
        error.code = "service-worker-timeout";
        reject(error);
      }, readyTimeoutMs);
    });
    try {
      return await Promise.race([ready, timeout]);
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  async function getSubscription() {
    if (!supportsWebPush()) return null;
    const registration = await getServiceWorkerReady();
    if (!registration?.pushManager?.getSubscription) throw new Error("推送管理器不可用");
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
    const refreshGeneration = ++settingsRefreshGeneration;
    const sessionKey = String(getSession()?.user?.id || "");
    const state = document.querySelector("#pushNotificationState");
    const detail = document.querySelector("#pushNotificationDetail");
    const enable = document.querySelector("#enablePushNotifications");
    const disable = document.querySelector("#disablePushNotifications");
    if (!state || !enable || !disable) return;
    const isCurrent = () => refreshGeneration === settingsRefreshGeneration
      && sessionKey === String(getSession()?.user?.id || "");
    if (!supportsWebPush()) {
      state.textContent = "当前设备不支持";
      if (detail) detail.textContent = "请使用 iOS 16.4+ 主屏幕 Web App 或现代浏览器。";
      enable.disabled = true;
      disable.disabled = true;
      disable.hidden = true;
      return;
    }
    if (Notification.permission === "denied") {
      state.textContent = "已被系统关闭";
      if (detail) detail.textContent = "请在浏览器或系统设置中重新允许通知。";
      enable.hidden = false;
      enable.disabled = true;
      disable.disabled = false;
      disable.hidden = true;
      return;
    }
    let subscription = null;
    let readinessError = null;
    try {
      subscription = await getSubscription();
    } catch (error) {
      readinessError = error;
    }
    if (!isCurrent()) return false;
    if (readinessError) {
      state.textContent = readinessError.code === "service-worker-timeout" ? "检查超时" : "暂不可用";
      if (detail) detail.textContent = "通知服务尚未就绪，请稍后重试。";
      enable.hidden = false;
      enable.disabled = false;
      disable.disabled = true;
      disable.hidden = true;
      return false;
    }
    const enabled = Notification.permission === "granted" && Boolean(subscription);
    state.textContent = enabled ? "已开启" : Notification.permission === "denied" ? "已被系统关闭" : "未开启";
    if (detail) detail.textContent = enabled
      ? "新日记、心愿、购物车商品、留言和晚间心情提醒会发送到这台设备。"
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
      const registration = await getServiceWorkerReady();
      if (!registration?.pushManager?.getSubscription || !registration.pushManager.subscribe) {
        throw new Error("推送管理器不可用");
      }
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
      openThanksDialog();
    } else if (type === "wish" || type === "shopping") {
      await switchPage("wishlist");
      await openWishlistDestination(type === "shopping" ? "shopping" : "wishlist");
    } else if (type === "mood_reminder") {
      await switchPage("mood");
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
