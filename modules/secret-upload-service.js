// One bounded queue per secret page. Uploaded assets stay in memory until their
// album checkpoint is acknowledged, so retrying a failed save never reuploads them.
export function createSecretUploadService({ onChange = () => {} } = {}) {
  let job = null;
  let running = false;

  function snapshot() {
    if (!job) return null;
    const saved = job.entries.filter((entry) => entry.state === "saved").length;
    const failed = job.entries.filter((entry) => entry.state === "failed");
    const pending = job.entries.filter((entry) => entry.state === "uploaded").length;
    return {
      title: job.title,
      total: job.entries.length,
      saved,
      pending,
      processed: saved + pending + failed.length,
      failed: failed.map(({ label, error }) => ({ label, error })),
      error: job.error,
      detail: job.detail,
      running,
      complete: saved === job.entries.length,
    };
  }

  function notify() { onChange(snapshot()); }

  async function run() {
    if (!job || running) return;
    running = true;
    job.error = "";
    for (const entry of job.entries) {
      if (entry.state === "failed") entry.state = "queued";
    }
    notify();
    const checkpoint = async () => {
      if (!job.entries.some((entry) => entry.state === "uploaded")) return;
      job.ensureContext();
      job.detail = "正在保存相册进度…";
      notify();
      const images = job.entries.filter((entry) => entry.image).map((entry) => entry.image);
      await job.save(images);
      job.ensureContext();
      for (const entry of job.entries) {
        if (entry.state === "uploaded") {
          entry.state = "saved";
          // Release original file references after each successful checkpoint.
          entry.source = null;
        }
      }
      notify();
    };
    try {
      job.ensureContext();
      await checkpoint();
      for (const entry of job.entries) {
        if (entry.state !== "queued") continue;
        job.ensureContext();
        job.detail = `正在处理 ${entry.label}`;
        notify();
        try {
          entry.image = await job.upload(entry.source, (message) => {
            job.detail = `${entry.label} · ${message}`;
            notify();
          });
          if (!entry.image) throw new Error("图片上传失败。");
          entry.state = "uploaded";
          entry.error = "";
        } catch (error) {
          entry.state = "failed";
          entry.error = error.message || "图片上传失败。";
        }
        notify();
        if (job.entries.filter((next) => next.state === "uploaded").length >= 10) await checkpoint();
      }
      await checkpoint();
    } catch (error) {
      job.error = error.message || "相册保存失败，请重试。";
    } finally {
      try { await job.onSettled?.(snapshot()); }
      catch (error) { job.error = error.message || "相册列表刷新失败。"; }
      running = false;
      job.detail = "";
      notify();
    }
    return snapshot();
  }

  return {
    snapshot,
    async start(options) {
      if (running || (job && !snapshot().complete)) return false;
      job = {
        ...options,
        entries: options.entries.map((entry) => ({ ...entry, state: "queued" })),
        error: "",
        detail: "",
      };
      await run();
      return true;
    },
    retry: run,
    clear() {
      // Do not lose uploaded assets whose album save has not been acknowledged.
      if (running || snapshot()?.pending) return false;
      job?.onClear?.(snapshot());
      job = null;
      notify();
      return true;
    },
    canStart() { return !running && (!job || snapshot().complete); },
  };
}
