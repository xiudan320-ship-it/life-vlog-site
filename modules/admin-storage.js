const root = document.querySelector("#adminStorageMeter");
const used = document.querySelector("#adminStorageUsed");
const month = document.querySelector("#adminStorageMonth");
let refreshPromise = null;
let refreshGeneration = 0;

function formatBytes(bytes) {
  const size = Math.max(0, Number(bytes) || 0);
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function reset() {
  if (!root) return;
  refreshGeneration += 1;
  refreshPromise = null;
  root.hidden = true;
  if (used) used.textContent = "—";
  if (month) month.textContent = "本月上传 —";
}

export async function refreshAdminStorage(request, isAdmin) {
  if (!root) return;
  if (!isAdmin()) {
    reset();
    return;
  }
  root.hidden = false;
  if (refreshPromise) return refreshPromise;
  if (used) used.textContent = "读取中…";
  if (month) month.textContent = "本月上传读取中…";
  const generation = refreshGeneration;
  const promise = (async () => {
    try {
      const payload = await request("/api/admin/r2-usage");
      if (generation !== refreshGeneration || !isAdmin()) return;
      const data = payload?.data || {};
      const usedBytes = Math.max(0, Number(data.used_bytes) || 0);
      const monthUploadedBytes = Math.max(0, Number(data.month_uploaded_bytes) || 0);
      const capacityLabel = data.capacity_label || "不限";
      if (used) used.textContent = `${formatBytes(usedBytes)} / ${capacityLabel}`;
      if (month) month.textContent = `本月上传 ${formatBytes(monthUploadedBytes)}`;
      root.title = `R2 已用 ${formatBytes(usedBytes)} / ${capacityLabel}；本月上传 ${formatBytes(monthUploadedBytes)}；点击打开 Cloudflare 控制台`;
    } catch (error) {
      if (used) used.textContent = "读取失败";
      if (month) month.textContent = "本月上传读取失败";
    }
  })().finally(() => {
    if (generation === refreshGeneration) refreshPromise = null;
  });
  refreshPromise = promise;
  return promise;
}

reset();
