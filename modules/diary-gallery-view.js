import {
  getDiaryMediaPosterUrl,
  getDiaryMediaType,
  getDiaryMediaVideoUrl,
  isDiaryMotionMedia,
} from "./media-metadata.js";
import { escapeHtml, formatDate } from "./ui-formatters.js";
import { captureListFocus, pulseListItem, restoreListFocus } from "./list-render-feedback.js";
import { renderListIcon } from "./list-icons.js";

const LAZY_IMAGE_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const lazyObservers = new WeakMap();
const motionCoordinators = new WeakMap();
const motionCoordinatorVersions = new WeakMap();
const motionPausedRoots = new WeakSet();
const mediaStateHandlers = new WeakMap();

export function getDiaryGalleryEmptyState({
  search = "",
  filter = "all",
  signedIn = false,
  favoriteStatus = "idle",
} = {}) {
  if (search) return { message: "没有找到匹配的日记。换个日期或关键词试试看。", loading: false };
  if (filter === "featured7") return { message: "最近七天还没有精选日记。", loading: false };
  if (filter === "favorites") {
    if (!signedIn) return { message: "登录后可以收藏喜欢的日记。", loading: false };
    if (favoriteStatus === "loading") return { message: "正在同步收藏…", loading: true };
    if (favoriteStatus === "error") return { message: "收藏同步失败，请稍后刷新重试。", loading: false };
    return { message: "还没有收藏日记。", loading: false };
  }
  if (filter === "VLOG") return { message: "还没有 VLOG，点击顶部 VLOG 发布第一条视频。", loading: false };
  return { message: "还没有这个分类的日记。", loading: false };
}

export function getPhotoAspectRatio(image) {
  const width = Number(image?.width);
  const height = Number(image?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return "0.8";
  return String(Math.min(1.55, Math.max(0.72, width / height)).toFixed(3));
}

function getPhotoAspectStyle(image) {
  return ` style="aspect-ratio: ${getPhotoAspectRatio(image)};"`;
}

export function renderFeedImage(image, altText, photoIndex, imageIndex, { mobile = false } = {}) {
  const isFirstImage = photoIndex === 0 && imageIndex === 0;
  const loading = isFirstImage ? "eager" : "lazy";
  const fetchPriority = isFirstImage ? "high" : "low";
  const width = Number(image?.width);
  const height = Number(image?.height);
  const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${Math.round(width)}"` : "";
  const heightAttr = Number.isFinite(height) && height > 0 ? ` height="${Math.round(height)}"` : "";
  const posterUrl = getDiaryMediaPosterUrl(image);
  const mediaType = getDiaryMediaType(image);
  const motionUrl = getDiaryMediaVideoUrl(image);
  const source = image?.thumbnail_url || posterUrl;
  const sourceAttributes = loading === "lazy"
    ? `src="${LAZY_IMAGE_PLACEHOLDER}" data-lazy-src="${escapeHtml(source)}"`
    : `src="${escapeHtml(source)}"`;
  const motionAttribute = motionUrl
    ? ` data-motion-src="${escapeHtml(motionUrl)}"`
    : "";
  return `<img class="feed-image" ${sourceAttributes} data-canonical-src="${escapeHtml(source)}" data-full-src="${escapeHtml(posterUrl)}" data-media-type="${escapeHtml(getDiaryMediaType(image))}"${motionAttribute} alt="${escapeHtml(altText)}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"${widthAttr}${heightAttr} />`;
}

function renderMediaShell(image, altText, photoIndex, imageIndex, options) {
  const mediaType = getDiaryMediaType(image);
  const mediaBadge = mediaType === "live"
    ? '<span class="live-photo-badge" aria-label="Live Photo">LIVE</span>'
    : mediaType === "video"
      ? '<span class="live-photo-badge" aria-label="Video">VIDEO</span>'
      : "";
  return `<div class="feed-media-shell" data-media-state="loading">
    <button type="button" data-photo-index="${photoIndex}" data-image-index="${imageIndex}">
      ${renderFeedImage(image, altText, photoIndex, imageIndex, options)}
      ${mediaBadge}
    </button>
    <div class="feed-media-error" data-media-error role="status" aria-live="polite" hidden>
      <span class="feed-media-error-icon" aria-hidden="true">${renderListIcon("image")}</span>
      <span>缩略图加载失败</span>
      <button type="button" data-media-retry data-photo-index="${photoIndex}" data-image-index="${imageIndex}">重试</button>
    </div>
  </div>`;
}

export function renderPhotoMedia(images, title, photoIndex, { mobile = false } = {}) {
  const altText = title || "日记图片";
  if (images.length <= 1) {
    const image = images[0] || {};
    return `
      <div class="photo-media single"${getPhotoAspectStyle(image)}>
        ${renderMediaShell(image, altText, photoIndex, 0, { mobile })}
      </div>
    `;
  }

  const previewImages = images.slice(0, 9);
  return `
      <div class="photo-media collage count-${previewImages.length}">
      ${previewImages.map((image, index) => `
        <div class="feed-media-collage-item">
          ${renderMediaShell(image, `${altText} ${index + 1}`, photoIndex, index, { mobile })}
          ${isDiaryMotionMedia(image) ? '<i class="multi-motion-dot" aria-label="动态媒体"></i>' : ""}
        </div>
      `).join("")}
      <span class="media-count">${images.length} 张</span>
    </div>
  `;
}

export function prepareFeedImages(root = document) {
  root.querySelectorAll("img.feed-image, img.secret-progressive-image").forEach((image) => {
    if (image.dataset.lazySrc) return;
    const shell = image.closest(".feed-media-shell");
    let handlers = mediaStateHandlers.get(image);
    if (!handlers) {
      const markLoaded = () => {
        image.classList.add("is-loaded");
        image.closest("button")?.classList.add("media-loaded");
        image.classList.remove("is-error");
        if (shell) {
          shell.dataset.mediaState = "loaded";
          shell.querySelector("[data-media-error]")?.setAttribute("hidden", "");
        }
      };
      const markError = () => {
        image.classList.remove("is-loaded");
        image.classList.add("is-error");
        image.closest("button")?.classList.remove("media-loaded");
        if (shell) {
          shell.dataset.mediaState = "error";
          shell.querySelector("[data-media-error]")?.removeAttribute("hidden");
        }
      };
      handlers = { markLoaded, markError };
      mediaStateHandlers.set(image, handlers);
      image.addEventListener("load", markLoaded);
      image.addEventListener("error", markError);
    }
    if (image.complete) {
      if (image.naturalWidth > 0) handlers.markLoaded();
      else handlers.markError();
      return;
    }
  });
}

export function hydrateLazyFeedImages(root = document) {
  lazyObservers.get(root)?.disconnect();
  lazyObservers.delete(root);
  const images = [...root.querySelectorAll("img.feed-image[data-lazy-src]")];
  if (!images.length) return;
  if (!("IntersectionObserver" in window)) {
    images.forEach((image) => {
      image.src = image.dataset.lazySrc;
      image.removeAttribute("data-lazy-src");
      image.dataset.canonicalSrc ||= image.src;
    });
    prepareFeedImages(root);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const image = entry.target;
      image.src = image.dataset.lazySrc;
      image.removeAttribute("data-lazy-src");
      image.dataset.canonicalSrc ||= image.src;
      observer.unobserve(image);
    }
    prepareFeedImages(root);
  }, { rootMargin: "240px 0px 360px", threshold: 0.01 });
  images.forEach((image) => observer.observe(image));
  lazyObservers.set(root, observer);
}

export function hydrateMotionFeedVideos(root = document) {
  motionCoordinators.get(root)?.destroy();
  motionCoordinators.delete(root);
  motionPausedRoots.delete(root);
  const version = (motionCoordinatorVersions.get(root) || 0) + 1;
  motionCoordinatorVersions.set(root, version);
  import("./diary-feed-motion-coordinator.js")
    .then(({ createDiaryFeedMotionCoordinator }) => {
      if (motionCoordinatorVersions.get(root) !== version) return;
      const coordinator = createDiaryFeedMotionCoordinator({ root });
      if (!coordinator) return;
      motionCoordinators.set(root, coordinator);
      if (!motionPausedRoots.has(root)) coordinator.refresh();
    })
    .catch(() => undefined);
}

export function stopMotionFeedVideos(root = document) {
  motionPausedRoots.add(root);
  motionCoordinators.get(root)?.pause();
}

export function destroyMotionFeedVideos(root = document) {
  motionPausedRoots.add(root);
  motionCoordinatorVersions.set(root, (motionCoordinatorVersions.get(root) || 0) + 1);
  const coordinator = motionCoordinators.get(root);
  coordinator?.destroy();
  motionCoordinators.delete(root);
}

export function resumeMotionFeedVideos(root = document) {
  motionPausedRoots.delete(root);
  motionCoordinators.get(root)?.resume();
}

export function retryFeedImage(root = document, photoIndex, imageIndex) {
  const image = [...root.querySelectorAll("img.feed-image")].find((candidate) => {
    const button = candidate.closest("[data-photo-index][data-image-index]");
    return Number(button?.dataset.photoIndex) === Number(photoIndex)
      && Number(button?.dataset.imageIndex) === Number(imageIndex);
  });
  if (!image) return false;
  const canonical = image.dataset.canonicalSrc || image.dataset.lazySrc || image.currentSrc || image.src;
  if (!canonical || canonical === LAZY_IMAGE_PLACEHOLDER) return false;
  const retryCount = Number(image.dataset.retryCount || 0);
  image.dataset.retryCount = String(retryCount + 1);
  image.classList.remove("is-error", "is-loaded");
  const shell = image.closest(".feed-media-shell");
  if (shell) {
    shell.dataset.mediaState = "loading";
    shell.querySelector("[data-media-error]")?.setAttribute("hidden", "");
  }
  const retryUrl = `${canonical}${canonical.includes("?") ? "&" : "?"}media_retry=${retryCount + 1}`;
  image.src = retryUrl;
  return true;
}

export function updateReadMoreHints(root = document) {
  root.querySelectorAll(".diary-excerpt").forEach((excerpt) => {
    const hint = excerpt.nextElementSibling;
    if (!hint?.classList.contains("read-more-hint")) return;
    hint.hidden = !(excerpt.scrollHeight > excerpt.clientHeight + 1);
  });
}

function buildPhotoCard(photo, index, options) {
  const photoOwnerId = options.getPhotoOwnerId(photo);
  const canManage = Boolean(options.signedIn && (!photoOwnerId || photoOwnerId === options.currentUserId));
  const canAdminCategorize = Boolean(options.signedIn && options.admin && photoOwnerId && photoOwnerId !== options.currentUserId);
  const canAdminUnpin = Boolean(options.signedIn && options.admin && photo.is_pinned);
  const displayTitle = options.getDisplayTitle(photo);
  const images = options.getPhotoImages(photo);
  const noteText = options.getPlainNote(photo);
  const favorite = options.isFavorite(photo);
  return `
    <article class="photo-card" data-photo-id="${escapeHtml(photo.id || "")}">
      <span class="strand-index">${String(index + 1).padStart(2, "0")}</span>
      <div class="photo-status-badges">
        ${photo.is_pinned ? `<span class="pin-badge">置顶</span>` : ""}
        ${photo.is_featured ? `<span class="featured-badge">精选</span>` : ""}
      </div>
      <div class="photo-open">
        ${renderPhotoMedia(images, displayTitle, index, { mobile: options.mobile })}
        <button class="photo-copy-open" type="button" data-photo-index="${index}" data-image-index="0">
          <p class="kicker diary-card-meta">
            <span>${formatDate(photo.taken_at || photo.created_at)}</span>
            <span class="diary-card-author">
              ${options.renderAvatar(photo.user_id, "diary-card-author-avatar")}
              <span>${escapeHtml(options.getAuthorName(photo.user_id))}</span>
            </span>
          </p>
          ${displayTitle ? `<h3>${escapeHtml(displayTitle)}</h3>` : ""}
          ${noteText ? `<p class="diary-excerpt">${escapeHtml(noteText)}</p><span class="read-more-hint" hidden>点击阅读全文</span>` : ""}
        </button>
      </div>
      <div class="card-actions">
        ${options.signedIn ? `<button class="favorite-photo ${favorite ? "active" : ""}" type="button" data-favorite-index="${index}" aria-pressed="${String(favorite)}">${renderListIcon("heart", "ui-icon-inline")} ${favorite ? "已收藏" : "收藏"}</button>` : ""}
        ${canManage ? `<button class="feature-photo ${photo.is_featured ? "active" : ""}" type="button" data-feature-index="${index}">${photo.is_featured ? "取消精选" : "设为精选"}</button>
          <button class="pin-photo ${photo.is_pinned ? "active" : ""}" type="button" data-pin-index="${index}">${photo.is_pinned ? "取消置顶" : "置顶"}</button>
          <button class="edit-photo" type="button" data-edit-index="${index}" title="编辑日记">编辑</button>` : ""}
        ${options.signedIn && (canManage || options.admin) ? `<button class="delete-photo" type="button" data-delete-index="${index}" title="删除日记">删除</button>` : ""}
        ${canAdminCategorize ? `<button class="edit-photo" type="button" data-admin-category-index="${index}" title="管理员修改分类">修改分类</button>` : ""}
        ${canAdminUnpin ? `<button class="pin-photo active admin-unpin-photo" type="button" data-admin-unpin-index="${index}" title="管理员取消置顶">取消置顶</button>` : ""}
      </div>
      ${options.renderCommentPreview(photo.id, index)}
    </article>
  `;
}

function bindGalleryActions(container, photos, handlers) {
  container.onclick = (event) => {
    const button = event.target.closest("button");
    if (!button || !container.contains(button)) return;
    const getPhoto = (key) => photos[Number(button.dataset[key])];
    if (button.matches("[data-media-retry]")) {
      handlers.retry?.(Number(button.dataset.photoIndex), Number(button.dataset.imageIndex));
    } else if (button.matches("[data-photo-index][data-image-index]")) {
      stopMotionFeedVideos(container);
      handlers.open(getPhoto("photoIndex"), Number(button.dataset.imageIndex));
    } else if (button.dataset.deleteIndex != null) {
      void handlers.delete(getPhoto("deleteIndex"), button);
    } else if (button.dataset.favoriteIndex != null) {
      void handlers.favorite(getPhoto("favoriteIndex"), button);
    } else if (button.dataset.featureIndex != null) {
      void handlers.flag(getPhoto("featureIndex"), "is_featured");
    } else if (button.dataset.pinIndex != null) {
      void handlers.flag(getPhoto("pinIndex"), "is_pinned");
    } else if (button.dataset.editIndex != null) {
      handlers.edit(getPhoto("editIndex"));
    } else if (button.dataset.adminCategoryIndex != null) {
      void handlers.adminCategory(getPhoto("adminCategoryIndex"));
    } else if (button.dataset.adminUnpinIndex != null) {
      void handlers.flag(getPhoto("adminUnpinIndex"), "is_pinned", { adminUnpin: true });
    } else if (button.dataset.openCommentsIndex != null) {
      handlers.open(getPhoto("openCommentsIndex"));
    }
  };
}

export function renderDiaryGalleryCards({ container, photos = [], updatedPhotoId = "", ...options }) {
  if (!container) return;
  const focusSnapshot = captureListFocus(container);
  container.innerHTML = photos.map((photo, index) => buildPhotoCard(photo, index, options)).join("");
  bindGalleryActions(container, photos, options.handlers);
  hydrateLazyFeedImages(container);
  hydrateMotionFeedVideos(container);
  prepareFeedImages(container);
  updateReadMoreHints(container);
  restoreListFocus(container, focusSnapshot);
  if (updatedPhotoId) pulseListItem(container, "data-photo-id", updatedPhotoId);
}
