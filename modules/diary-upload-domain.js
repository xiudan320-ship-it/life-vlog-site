export function getDiaryUploadFileExtension(file) {
  return String(file?.name || "").match(/\.([a-z0-9]{1,8})$/i)?.[1].toLowerCase() || "";
}

export function isDiaryUploadStillFile(file) {
  return (
    String(file?.type || "").toLowerCase().startsWith("image/") ||
    /\.(avif|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(file?.name || "")
  );
}

export function isDiaryUploadMotionFile(file) {
  return (
    String(file?.type || "").toLowerCase().startsWith("video/") ||
    /\.(mov|mp4|m4v|webm)$/i.test(file?.name || "")
  );
}

export function getDiaryUploadEntryCount(pairing) {
  return pairing.entries.length + pairing.videoFiles.length;
}

export function getDiaryUploadFileKey(file) {
  return [file?.name || "", file?.size || 0, file?.lastModified || 0, file?.type || ""].join("|");
}

function getDiaryUploadFileStem(file) {
  return String(file?.name || "")
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLocaleLowerCase();
}

export function pairDiaryUploadFiles(files = []) {
  const stillFiles = [];
  const motionFiles = [];
  const unsupportedFiles = [];
  for (const file of files) {
    if (isDiaryUploadStillFile(file)) {
      stillFiles.push(file);
    } else if (isDiaryUploadMotionFile(file)) {
      motionFiles.push(file);
    } else {
      unsupportedFiles.push(file);
    }
  }

  const unusedMotionFiles = new Set(motionFiles);
  const entries = stillFiles.map((file) => {
    const stem = getDiaryUploadFileStem(file);
    const motionFile = motionFiles.find(
      (candidate) => unusedMotionFiles.has(candidate) && getDiaryUploadFileStem(candidate) === stem
    );
    if (motionFile) unusedMotionFiles.delete(motionFile);
    return { file, motionFile: motionFile || null };
  });

  const unpairedEntries = entries.filter((entry) => !entry.motionFile);
  const remainingMotionFiles = motionFiles.filter((file) => unusedMotionFiles.has(file));
  unpairedEntries.slice(0, remainingMotionFiles.length).forEach((entry, index) => {
    entry.motionFile = remainingMotionFiles[index];
    unusedMotionFiles.delete(remainingMotionFiles[index]);
  });

  return {
    stillFiles,
    entries,
    motionFiles,
    videoFiles: [...unusedMotionFiles],
    unsupportedFiles,
  };
}

export function getDiaryUploadPreviewItems(files = [], linkUrls = []) {
  const pairing = pairDiaryUploadFiles(files);
  return {
    pairing,
    items: [
      ...pairing.entries.map((entry) => ({
        kind: entry.motionFile ? "live" : "image",
        file: entry.file,
        files: [entry.file, entry.motionFile].filter(Boolean),
        label: entry.motionFile ? `${entry.file.name} · Live Photo` : entry.file.name,
      })),
      ...pairing.videoFiles.map((file) => ({
        kind: "video",
        file,
        files: [file],
        label: `${file.name} · 普通视频`,
      })),
      ...pairing.unsupportedFiles.map((file) => ({
        kind: "unsupported",
        file,
        files: [file],
        label: `${file.name} · 不支持`,
      })),
      ...linkUrls.map((url) => ({
        kind: "link",
        url,
        files: [],
        label: "图片链接",
      })),
    ],
  };
}

export function createDiaryUploadPayload({
  title,
  rawTitle = "",
  note = "",
  category = "日常",
  takenAt = "",
  isPublic = false,
  userId = "",
  files = [],
  linkUrls = [],
  pairing = pairDiaryUploadFiles(files),
  id = crypto.randomUUID(),
  createdAt = new Date().toISOString(),
} = {}) {
  if (pairing.unsupportedFiles.length) {
    throw new Error("只支持图片和视频文件。");
  }
  return {
    id,
    userId,
    title,
    rawTitle,
    note,
    category,
    takenAt,
    isPublic,
    createdAt,
    files: [
      ...pairing.entries.map(({ file, motionFile }) => ({
        kind: motionFile ? "live" : "image",
        file,
        name: file.name || "diary-image",
        type: file.type || "image/jpeg",
        size: file.size || 0,
        lastModified: file.lastModified || Date.now(),
        motionFile: motionFile || null,
      })),
      ...pairing.videoFiles.map((file) => ({
        kind: "video",
        file,
        name: file.name || "diary-video",
        type: file.type || "video/quicktime",
        size: file.size || 0,
        lastModified: file.lastModified || Date.now(),
      })),
    ],
    linkUrls: [...linkUrls],
  };
}
