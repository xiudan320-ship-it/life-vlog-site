function wait(delay) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delay));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片压缩失败。"));
      },
      type,
      quality
    );
  });
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

export function getVideoFileExtension(file) {
  const extension = String(file?.name || "").match(/\.([a-z0-9]{1,8})$/i)?.[1].toLowerCase();
  if (extension) return extension;
  const type = String(file?.type || "").toLowerCase();
  if (type === "video/mp4") return "mp4";
  if (type === "video/webm") return "webm";
  if (type === "video/x-m4v") return "m4v";
  return "mov";
}

export function getVideoContentType(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("video/")) return type;
  const extension = getVideoFileExtension(file);
  if (extension === "mp4") return "video/mp4";
  if (extension === "webm") return "video/webm";
  if (extension === "m4v") return "video/x-m4v";
  return "video/quicktime";
}

export async function createVideoPosterFile(file) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  try {
    await new Promise((resolve, reject) => {
      video.addEventListener("loadeddata", resolve, { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("这个视频无法在当前浏览器读取，请先导出兼容的视频格式。")),
        { once: true }
      );
      video.src = objectUrl;
      video.load();
    });
    const sourceWidth = Number(video.videoWidth);
    const sourceHeight = Number(video.videoHeight);
    if (!sourceWidth || !sourceHeight) {
      throw new Error("无法从这个视频提取封面，请先导出兼容的视频格式后重试。");
    }
    const scale = Math.min(1, 2048 / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法生成视频封面，请重试。");
    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => (nextBlob ? resolve(nextBlob) : reject(new Error("视频封面生成失败，请重试。"))),
        "image/jpeg",
        0.9
      );
    });
    const stem = String(file?.name || "").replace(/\.[^.]+$/, "").trim() || "video";
    return new File([blob], `${stem}-cover.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export function createImageService({
  endpoint,
  getAccessToken,
  getUploadQuality,
  isNetworkError = () => false,
  onTaskChanged = () => {},
  taskMap = new Map(),
  fetchApi = globalThis.fetch,
} = {}) {
  const normalizedEndpoint = String(endpoint || "").replace(/\/+$/, "");

  async function compressImage(file, options = null) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const settings = options || getUploadQuality();
          const rotatePortrait = Boolean(settings.rotatePortrait && image.height > image.width);
          const sourceWidth = rotatePortrait ? image.height : image.width;
          const sourceHeight = rotatePortrait ? image.width : image.height;
          const scale = Math.min(1, settings.maxSide / Math.max(sourceWidth, sourceHeight));
          let width = Math.max(1, Math.round(sourceWidth * scale));
          let height = Math.max(1, Math.round(sourceHeight * scale));
          let quality = settings.jpeg;
          let blob;

          for (let resizePass = 0; resizePass < 3; resizePass += 1) {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, width, height);
            if (rotatePortrait) {
              context.translate(width, 0);
              context.rotate(Math.PI / 2);
              context.drawImage(image, 0, 0, height, width);
            } else {
              context.drawImage(image, 0, 0, width, height);
            }

            quality = settings.jpeg;
            blob = await canvasToBlob(canvas, "image/jpeg", quality);
            while (blob.size > settings.targetBytes && quality > settings.minJpeg) {
              quality = Math.max(settings.minJpeg, quality - 0.07);
              blob = await canvasToBlob(canvas, "image/jpeg", quality);
            }
            if (blob.size <= settings.targetBytes || resizePass === 2) break;
            const reduction = Math.max(
              0.68,
              Math.min(0.9, Math.sqrt(settings.targetBytes / blob.size) * 0.94)
            );
            width = Math.max(1, Math.round(width * reduction));
            height = Math.max(1, Math.round(height * reduction));
          }

          resolve({
            blob,
            width,
            height,
            originalBytes: file.size,
            compressedBytes: blob.size,
            quality,
          });
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("图片读取失败，请换一张图片重试。"));
      };
      image.src = objectUrl;
    });
  }

  async function uploadToR2(blob, safeName, folder = "photos", options = {}) {
    const accessToken = getAccessToken?.();
    if (!normalizedEndpoint || !accessToken) {
      throw new Error("R2 上传服务尚未配置。");
    }
    const fileName = options.fileName || `${safeName}.jpg`;
    const contentType = options.contentType || "image/jpeg";
    const taskId = crypto.randomUUID();
    taskMap.set(taskId, {
      id: taskId,
      title: safeName || "图片",
      folder,
      size: blob.size,
      state: "uploading",
      attempt: 1,
    });
    onTaskChanged(taskMap);
    let lastError;
    try {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        taskMap.set(taskId, { ...taskMap.get(taskId), attempt });
        onTaskChanged(taskMap);
        try {
          const formData = new FormData();
          formData.set("file", new File([blob], fileName, { type: contentType }));
          formData.set("name", safeName);
          formData.set("folder", folder);
          const response = await fetchApi(`${normalizedEndpoint}/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok) {
            taskMap.set(taskId, { ...taskMap.get(taskId), state: "done" });
            return data;
          }
          if (!isRetryableStatus(response.status)) {
            throw new Error(data.error || `上传服务返回 ${response.status}`);
          }
          lastError = new Error(data.error || `上传服务暂时不可用（${response.status}）`);
        } catch (error) {
          lastError = error;
          if (
            !isNetworkError(error) &&
            !/暂时不可用|429|5\d\d/.test(String(error?.message || ""))
          ) {
            throw error;
          }
        }
        if (attempt < 3) await wait(500 * 2 ** (attempt - 1));
      }
      taskMap.set(taskId, { ...taskMap.get(taskId), state: "failed" });
      throw lastError || new Error("上传失败，请稍后重试。");
    } finally {
      globalThis.setTimeout(() => {
        taskMap.delete(taskId);
        onTaskChanged(taskMap);
      }, 1800);
    }
  }

  async function copyUrlToR2(url, safeName, folder = "migrated") {
    const accessToken = getAccessToken?.();
    if (!normalizedEndpoint || !accessToken) {
      throw new Error("R2 upload service is not configured.");
    }
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetchApi(`${normalizedEndpoint}/copy`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, name: safeName, folder }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) return data;
        if (!isRetryableStatus(response.status)) {
          throw new Error(data.error || `图片链接导入失败（${response.status}）`);
        }
        lastError = new Error(data.error || `图片链接导入暂时不可用（${response.status}）`);
      } catch (error) {
        lastError = error;
        if (
          !isNetworkError(error) &&
          !/暂时不可用|429|5\d\d/.test(String(error?.message || ""))
        ) {
          throw error;
        }
      }
      if (attempt < 3) await wait(500 * 2 ** (attempt - 1));
    }
    throw lastError || new Error("图片链接导入失败，请稍后重试。");
  }

  async function deleteR2Object(key) {
    const accessToken = getAccessToken?.();
    if (!normalizedEndpoint || !accessToken) return;
    const response = await fetchApi(`${normalizedEndpoint}/object`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `R2 删除失败：${response.status}`);
    }
  }

  return {
    compressImage,
    copyUrlToR2,
    deleteR2Object,
    uploadToR2,
  };
}
