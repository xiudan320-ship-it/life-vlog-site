export function createAssetController({
  imageService,
  publicUrl,
  legacyBucket,
  formatFileSize,
  getVideoContentType,
  getVideoFileExtension,
  slugify,
  setStatus,
}) {
  function compressImage(file, options = null) {
    return imageService.compressImage(file, options);
  }

  async function uploadToR2(blob, safeName, folder = "photos", options = {}) {
    return imageService.uploadToR2(blob, safeName, folder, options);
  }

  async function copyUrlToR2(url, safeName, folder = "migrated") {
    return imageService.copyUrlToR2(url, safeName, folder);
  }

  async function uploadImageFile(file, safeName, index = 1, total = 1, options = {}) {
    const folder = options.folder || "photos";
    const statusSetter = options.statusSetter || setStatus;
    const prefix = total > 1 ? `${index}/${total} · ` : "";
    statusSetter(`${prefix}正在自动压缩图片...`);
    let compressed;
    try {
      compressed = await compressImage(file);
    } catch (error) {
      statusSetter(error.message || "图片压缩失败。");
      return null;
    }
    statusSetter(
      `${prefix}已压缩 ${formatFileSize(file.size)} → ${formatFileSize(compressed.blob.size)}，正在上传...`
    );
    try {
      const uploaded = await uploadToR2(compressed.blob, safeName, folder);
      let thumbnail = null;
      if (options.thumbnail !== false && Math.max(compressed.width, compressed.height) > 720) {
        try {
          const thumbCompressed = await compressImage(file, {
            maxSide: 640,
            targetBytes: 140 * 1024,
            jpeg: 0.76,
            minJpeg: 0.5,
            rotatePortrait: false,
          });
          thumbnail = await uploadToR2(thumbCompressed.blob, `${safeName}-thumb`, `${folder}-thumbs`);
        } catch (error) {
          console.warn("Thumbnail upload skipped:", error);
        }
      }
      return {
        image_path: `r2:${uploaded.key}`,
        image_url: uploaded.url,
        thumbnail_path: thumbnail?.key ? `r2:${thumbnail.key}` : "",
        thumbnail_url: thumbnail?.url || uploaded.url,
        width: compressed.width,
        height: compressed.height,
        original_size: compressed.originalBytes,
        compressed_size: compressed.compressedBytes,
      };
    } catch (error) {
      statusSetter(`R2 上传失败：${error.message}`);
      return null;
    }
  }

  async function uploadDiaryMotionFile(file, safeName, index = 1, total = 1) {
    const prefix = total > 1 ? `${index}/${total} · ` : "";
    setStatus(`${prefix}正在上传 Live Photo 动态部分...`);
    try {
      const extension = getVideoFileExtension(file);
      return await uploadToR2(file, safeName, "photos-live", {
        fileName: `${safeName}.${extension}`,
        contentType: getVideoContentType(file),
      });
    } catch (error) {
      setStatus(`Live Photo 上传失败：${error.message}`);
      throw error;
    }
  }

  async function uploadDiaryVideoFile(file, safeName, index = 1, total = 1) {
    const prefix = total > 1 ? `${index}/${total} · ` : "";
    setStatus(`${prefix}正在上传普通视频...`);
    try {
      const extension = getVideoFileExtension(file);
      return await uploadToR2(file, safeName, "photos-video", {
        fileName: `${safeName}.${extension}`,
        contentType: getVideoContentType(file),
      });
    } catch (error) {
      setStatus(`普通视频上传失败：${error.message}`);
      throw error;
    }
  }

  function isR2Path(path) {
    return String(path || "").startsWith("r2:");
  }

  function isR2Url(url) {
    const value = String(url || "");
    return Boolean(publicUrl && value.startsWith(`${publicUrl.replace(/\/+$/, "")}/`));
  }

  function getR2Key(path) {
    return String(path || "").replace(/^r2:/, "");
  }

  function getR2PublicAssetUrl(path) {
    const key = getR2Key(path);
    if (!key || !publicUrl) return "";
    return `${publicUrl.replace(/\/+$/, "")}/${key
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;
  }

  function resolveStoredAssetUrl(value = "", path = "") {
    const rawValue = String(value || "");
    const rawPath = String(path || "");
    if (isR2Path(rawValue)) return getR2PublicAssetUrl(rawValue);
    if (/^https?:\/\//i.test(rawValue)) return rawValue;
    if (isR2Path(rawPath)) return getR2PublicAssetUrl(rawPath);
    return /^https?:\/\//i.test(rawPath) ? rawPath : "";
  }

  function getProfileAvatarUrl(profile = {}) {
    const avatarPath = profile.avatar_path || profile.avatarPath || "";
    if (isR2Path(avatarPath)) return getR2PublicAssetUrl(avatarPath);
    return resolveStoredAssetUrl(profile.avatar_url || profile.avatarUrl || "", avatarPath);
  }

  function getLegacyStoragePathFromPublicUrl(url) {
    const marker = `/storage/v1/object/public/${legacyBucket}/`;
    const value = String(url || "");
    const index = value.indexOf(marker);
    if (index === -1) return "";
    return decodeURIComponent(value.slice(index + marker.length).split("?")[0]);
  }

  function isDataImageUrl(url) {
    return String(url || "").startsWith("data:image/");
  }

  function shouldMigrateImageAsset(url, path = "") {
    if (!url && !path) return false;
    if (isR2Path(path) || isR2Url(url)) return false;
    return Boolean((path && !isR2Path(path)) || getLegacyStoragePathFromPublicUrl(url) || isDataImageUrl(url));
  }

  async function uploadDataUrlToR2(dataUrl, safeName, folder) {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error("Could not read data image.");
    const blob = await response.blob();
    const file = new File([blob], `${safeName}.jpg`, { type: blob.type || "image/jpeg" });
    const compressed = await compressImage(file, {
      maxSide: 1600,
      jpeg: 0.84,
      minJpeg: 0.62,
      targetBytes: 650_000,
    });
    return uploadToR2(compressed.blob, safeName, folder);
  }

  async function migrateImageAsset({ url = "", path = "", name = "image", folder = "migrated" }) {
    if (!shouldMigrateImageAsset(url, path)) {
      return { changed: false, image_url: url, image_path: path, oldPath: "" };
    }
    const safeName = slugify(name || folder || "image");
    const sourceUrl = url;
    if (!sourceUrl) return { changed: false, image_url: url, image_path: path, oldPath: "" };
    const uploaded = isDataImageUrl(sourceUrl)
      ? await uploadDataUrlToR2(sourceUrl, safeName, folder)
      : await copyUrlToR2(sourceUrl, safeName, folder);
    return {
      changed: true,
      image_url: uploaded.url,
      image_path: `r2:${uploaded.key}`,
      oldPath: path && !isR2Path(path) ? path : getLegacyStoragePathFromPublicUrl(url),
    };
  }

  async function deleteR2Object(path) {
    return imageService.deleteR2Object(getR2Key(path));
  }

  async function cleanupStoredImagePaths(paths) {
    const uniquePaths = [...new Set(paths.filter(Boolean))];
    const errors = [];
    for (const path of uniquePaths.filter(isR2Path)) {
      try {
        await deleteR2Object(path);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw errors[0];
  }

  return {
    cleanupStoredImagePaths,
    compressImage,
    copyUrlToR2,
    deleteR2Object,
    getProfileAvatarUrl,
    getR2Key,
    getR2PublicAssetUrl,
    isR2Path,
    isR2Url,
    migrateImageAsset,
    resolveStoredAssetUrl,
    shouldMigrateImageAsset,
    uploadDiaryMotionFile,
    uploadDiaryVideoFile,
    uploadImageFile,
    uploadToR2,
  };
}
