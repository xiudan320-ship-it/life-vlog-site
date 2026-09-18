const DEFAULT_STATUS = "管理员专属数据，仅在本设置页读取。";

function getViewFromDocument(documentTarget) {
  const root = documentTarget?.querySelector?.("#adminStorageMeter") || null;
  return {
    root,
    used: root?.querySelector?.("#adminStorageUsed") || documentTarget?.querySelector?.("#adminStorageUsed") || null,
    month: root?.querySelector?.("#adminStorageMonth") || documentTarget?.querySelector?.("#adminStorageMonth") || null,
    status: root?.querySelector?.("#adminStorageStatus") || documentTarget?.querySelector?.("#adminStorageStatus") || null,
    retry: root?.querySelector?.("#adminStorageRetry") || documentTarget?.querySelector?.("#adminStorageRetry") || null,
  };
}

function setText(node, value) {
  if (node) node.textContent = value;
}

function setBusy(view, value) {
  if (view.root) view.root.setAttribute("aria-busy", value ? "true" : "false");
}

export function formatBytes(bytes) {
  const size = Math.max(0, Number(bytes) || 0);
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function createAdminStorageController({
  documentTarget = typeof document === "undefined" ? null : document,
  getElements = () => getViewFromDocument(documentTarget),
  request,
  isAdmin = () => false,
  getAccountKey = () => "",
  logger = typeof console === "undefined" ? null : console,
} = {}) {
  let refreshPromise = null;
  let refreshGeneration = 0;
  let boundRetry = null;
  let boundRoot = null;

  function getView() {
    return getElements?.() || {};
  }

  function clearView(view = getView()) {
    if (view.root) view.root.hidden = true;
    setBusy(view, false);
    setText(view.used, "—");
    setText(view.month, "本月上传 —");
    setText(view.status, DEFAULT_STATUS);
  }

  function handleRetry(event) {
    event?.preventDefault?.();
    void refresh();
  }

  function bindView() {
    const view = getView();
    if (!view.root) return view;
    if (boundRoot !== view.root) {
      boundRetry?.removeEventListener?.("click", handleRetry);
      boundRoot = view.root;
      boundRetry = view.retry || null;
      boundRetry?.addEventListener?.("click", handleRetry);
    }
    return view;
  }

  function reset() {
    refreshGeneration += 1;
    refreshPromise = null;
    clearView(bindView());
  }

  async function refresh() {
    const view = bindView();
    const accountKey = String(getAccountKey?.() || "");
    if (!view.root || !accountKey || !isAdmin?.()) {
      clearView(view);
      return false;
    }
    if (refreshPromise) return refreshPromise;

    const generation = refreshGeneration;
    setBusy(view, true);
    view.root.hidden = false;
    setText(view.used, "读取中…");
    setText(view.month, "本月上传读取中…");
    setText(view.status, "正在读取管理员存储统计…");

    refreshPromise = (async () => {
      try {
        const payload = await request?.("/api/admin/r2-usage");
        const stillCurrent = generation === refreshGeneration
          && accountKey === String(getAccountKey?.() || "")
          && Boolean(isAdmin?.());
        if (!stillCurrent) return false;
        const data = payload?.data || payload || {};
        const usedBytes = Math.max(0, Number(data.used_bytes ?? data.totalBytes) || 0);
        const monthUploadedBytes = Math.max(0, Number(data.month_uploaded_bytes ?? data.monthlyUploadBytes) || 0);
        const capacityLabel = data.capacity_label || data.capacityLabel || "不限";
        setText(view.used, `${formatBytes(usedBytes)} / ${capacityLabel}`);
        setText(view.month, `本月上传 ${formatBytes(monthUploadedBytes)}`);
        setText(view.status, `${Number(data.object_count ?? data.objectCount) || 0} 个对象 · 最近更新 ${data.generated_at || data.generatedAt || "刚刚"}`);
        if (view.root) view.root.title = `R2 已用 ${formatBytes(usedBytes)} / ${capacityLabel}；本月上传 ${formatBytes(monthUploadedBytes)}`;
        return true;
      } catch (error) {
        const stillCurrent = generation === refreshGeneration
          && accountKey === String(getAccountKey?.() || "")
          && Boolean(isAdmin?.());
        if (!stillCurrent) return false;
        setText(view.used, "读取失败");
        setText(view.month, "本月上传读取失败");
        setText(view.status, "读取失败，请稍后重试。");
        logger?.warn?.("admin storage usage unavailable", error);
        return false;
      } finally {
        if (generation === refreshGeneration) {
          setBusy(view, false);
          refreshPromise = null;
        }
      }
    })();

    return refreshPromise;
  }

  function initialize() {
    bindView();
  }

  reset();
  return Object.freeze({ initialize, refresh, reset, retry: refresh, formatBytes });
}
