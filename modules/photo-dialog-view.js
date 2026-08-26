import { normalizeSecretPhotoTags } from "./secret-domain.js?v=20260826-005";
import { escapeHtml } from "./ui-formatters.js";
import { fitVideoToContainer } from "./diary-video-layout.js";

export function updateDiaryViewerToolbar({
  toolbar,
  counter,
  zoomValue,
  previousButton,
  nextButton,
  open = false,
  total = 0,
  index = 0,
  zoomScale = 1,
}) {
  if (!toolbar) return;
  toolbar.hidden = !open;
  if (!open) return;
  const safeTotal = Math.max(1, total);
  counter.textContent = `${Math.min(index + 1, safeTotal)} / ${safeTotal}`;
  zoomValue.textContent = `${Math.round(zoomScale * 100)}%`;
  previousButton.disabled = safeTotal <= 1;
  nextButton.disabled = safeTotal <= 1;
}

export function updateSecretViewerToolbar({
  toolbar,
  counter,
  zoomValue,
  previousButton,
  nextButton,
  zoomOutButton,
  zoomInButton,
  infoButton,
  open = false,
  total = 0,
  index = 0,
  zoomScale = 1,
  infoOpen = false,
}) {
  if (!toolbar) return;
  toolbar.hidden = !open;
  if (!open) return;
  const safeTotal = Math.max(1, total);
  counter.textContent = `${Math.min(index + 1, safeTotal)} / ${safeTotal}`;
  zoomValue.textContent = `${Math.round(zoomScale * 100)}%`;
  previousButton.disabled = index <= 0;
  nextButton.disabled = index >= safeTotal - 1;
  zoomOutButton.disabled = zoomScale <= 1.01;
  zoomInButton.disabled = zoomScale >= 5.99;
  infoButton.setAttribute("aria-pressed", String(infoOpen));
  infoButton.classList.toggle("active", infoOpen);
}

export function setViewerStatus({ status, text }, state, message = "") {
  if (!status) return;
  status.hidden = !state;
  status.dataset.state = state || "";
  text.textContent = message || (state === "error" ? "图片加载失败" : "正在加载图片");
}

export function fitDialogMedia({ image, video, container }) {
  fitVideoToContainer(video, container);
  if (!image?.naturalWidth || !container) return false;
  const style = getComputedStyle(container);
  const availableWidth = Math.max(
    1,
    container.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0)
  );
  const availableHeight = Math.max(
    1,
    container.clientHeight - parseFloat(style.paddingTop || 0) - parseFloat(style.paddingBottom || 0)
  );
  const scale = Math.min(availableWidth / image.naturalWidth, availableHeight / image.naturalHeight);
  image.style.setProperty("width", `${Math.max(1, image.naturalWidth * scale)}px`, "important");
  image.style.setProperty("height", `${Math.max(1, image.naturalHeight * scale)}px`, "important");
  return true;
}

export function renderSecretDialogControls(image) {
  const tags = normalizeSecretPhotoTags(image);
  const favorite = Boolean(image?.favorite);
  return `
    <div class="secret-dialog-tools secret-dialog-readonly-tools">
      <button class="secret-dialog-favorite ${favorite ? "active" : ""}" type="button" data-secret-dialog-favorite>${favorite ? "♥ 已收藏" : "♡ 收藏"}</button>
      <button class="secret-dialog-delete" type="button" data-secret-dialog-delete>删除相片</button>
      <div class="secret-dialog-current-tags">
        <span>展品 Tag</span>
        <div>${tags.map((tag) => `<button type="button" data-secret-dialog-remove-tag="${escapeHtml(tag)}">${escapeHtml(tag)} <b>×</b></button>`).join("")}</div>
      </div>
      <form class="secret-dialog-add-tag" data-secret-dialog-tag-form>
        <label><span>添加 Tag</span><input name="secretDialogTag" maxlength="32" list="secretCategoryList" autocomplete="off" placeholder="输入或选择已有 Tag" /></label>
        <button type="submit">添加</button>
      </form>
      <p data-secret-dialog-status></p>
    </div>
  `;
}

export function bindSecretDialogControls({ container, onFavorite, onDelete = () => {}, onRemoveTag, onAddTag }) {
  if (!container) return;
  container.querySelector("[data-secret-dialog-favorite]")?.addEventListener("click", onFavorite);
  container.querySelector("[data-secret-dialog-delete]")?.addEventListener("click", onDelete);
  container.querySelectorAll("[data-secret-dialog-remove-tag]").forEach((button) => {
    button.addEventListener("click", () => onRemoveTag(button.dataset.secretDialogRemoveTag || ""));
  });
  container.querySelector("[data-secret-dialog-tag-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const tag = String(event.currentTarget.elements.secretDialogTag?.value || "").trim();
    if (tag) onAddTag(tag);
  });
}

export function renderDialogPagination({
  images = [],
  index = 0,
  secret = false,
  previousButton,
  nextButton,
  counter,
  dots,
  thumbs,
  onSelect,
}) {
  const multiple = images.length > 1;
  previousButton.hidden = !multiple;
  nextButton.hidden = !multiple;
  counter.hidden = !multiple;
  dots.hidden = !multiple;
  thumbs.hidden = !multiple;
  counter.textContent = multiple ? `${index + 1}/${images.length}` : "";
  previousButton.disabled = secret ? index <= 0 : !multiple;
  nextButton.disabled = secret ? index >= images.length - 1 : !multiple;
  if (!multiple) {
    dots.innerHTML = "";
    thumbs.innerHTML = "";
    return;
  }
  dots.innerHTML = images.map((_, dotIndex) => `
    <button class="${dotIndex === index ? "active" : ""}" type="button" role="tab" data-dialog-dot="${dotIndex}" aria-label="查看第 ${dotIndex + 1} 张" aria-selected="${dotIndex === index}"></button>
  `).join("");
  thumbs.innerHTML = images.map((image, thumbIndex) => `
    <button class="${thumbIndex === index ? "active" : ""}" type="button" data-dialog-thumb="${thumbIndex}" aria-label="查看第 ${thumbIndex + 1} 张">
      <img src="${escapeHtml(image.image_url)}" alt="" />
    </button>
  `).join("");
  thumbs.querySelectorAll("button[data-dialog-thumb]").forEach((button) => {
    button.addEventListener("click", () => onSelect(Number(button.dataset.dialogThumb)));
  });
}
