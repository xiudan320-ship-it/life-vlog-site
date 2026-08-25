import { toDateInputValue } from "./app-domain.js";

export function createDiaryMetadata({ elements, generatedTitlePrefixes, slugify }) {
  const els = elements;

  function getFinalTitle() {
    return els.titleInput.value.trim();
  }

  function getUploadFileNameBase(title, index = 0, total = 1) {
    const dateText = els.dateInput.value || toDateInputValue(new Date());
    const base = title || `photo-${dateText}`;
    return total > 1 ? `${slugify(base)}-${String(index + 1).padStart(2, "0")}` : slugify(base);
  }

  function isGeneratedTitle(title) {
    if (title === "未命名照片") return true;
    return generatedTitlePrefixes.some((prefix) => title.startsWith(`${prefix} · `));
  }

  function getDisplayTitle(photo) {
    const title = String(photo?.title || "").trim();
    return !title || isGeneratedTitle(title) ? "" : title;
  }

  function getPhotoLabel(photo) {
    return getDisplayTitle(photo) || "无标题日记";
  }

  return {
    getDisplayTitle,
    getFinalTitle,
    getPhotoLabel,
    getUploadFileNameBase,
    isGeneratedTitle,
  };
}
