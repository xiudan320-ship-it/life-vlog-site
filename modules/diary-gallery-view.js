import {
  getDiaryMediaPosterUrl,
  getDiaryMediaType,
  getDiaryMediaVideoUrl,
  isDiaryMotionMedia,
} from "./media-metadata.js";
import { escapeHtml, formatDate } from "./ui-formatters.js";

const EAGER_DESKTOP_CARD_COUNT = 4;

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

export function shouldAutoplayDiaryFeedMedia(
  photoIndex = 0,
  {
    mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 920px)").matches,
    connection = typeof navigator !== "undefined"
      ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
      : null,
  } = {}
) {
  if (mobile) return photoIndex < 5;
  if (!connection) return true;
  if (connection.saveData || connection.type === "cellular") return false;
  if (connection.type === "wifi" || connection.type === "ethernet") return true;
  return !/(^|-)2g$/.test(connection.effectiveType || "");
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
  const eagerCount = mobile ? 2 : EAGER_DESKTOP_CARD_COUNT;
  const loading = photoIndex < eagerCount ? "eager" : "lazy";
  const fetchPriority = photoIndex < (mobile ? 1 : 2) && imageIndex === 0 ? "high" : "low";
  const width = Number(image?.width);
  const height = Number(image?.height);
  const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${Math.round(width)}"` : "";
  const heightAttr = Number.isFinite(height) && height > 0 ? ` height="${Math.round(height)}"` : "";
  const posterUrl = getDiaryMediaPosterUrl(image);
  const motionUrl = getDiaryMediaVideoUrl(image);
  const videoUrl = shouldAutoplayDiaryFeedMedia(photoIndex, { mobile }) ? motionUrl : "";
  const videoPreviewStyle = motionUrl
    ? ' style="width:100%;height:100%;object-fit:contain;background:#080b09;"'
    : "";

  if (videoUrl) {
    return `<video class="feed-image" src="${escapeHtml(videoUrl)}" poster="${escapeHtml(posterUrl)}" data-full-src="${escapeHtml(posterUrl)}" aria-label="${escapeHtml(altText)}" autoplay muted loop playsinline preload="metadata"${videoPreviewStyle}${widthAttr}${heightAttr}></video>`;
  }
  return `<img class="feed-image" src="${escapeHtml(image?.thumbnail_url || posterUrl)}" data-full-src="${escapeHtml(posterUrl)}" alt="${escapeHtml(altText)}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"${videoPreviewStyle}${widthAttr}${heightAttr} />`;
}

export function renderPhotoMedia(images, title, photoIndex, { mobile = false } = {}) {
  const altText = title || "日记图片";
  if (images.length <= 1) {
    const image = images[0] || {};
    const mediaType = getDiaryMediaType(image);
    const badgeLabel = mediaType === "live" ? "LIVE" : mediaType === "video" ? "VIDEO" : "";
    return `
      <div class="photo-media single"${getPhotoAspectStyle(image)}>
        <button type="button" data-photo-index="${photoIndex}" data-image-index="0">
          ${renderFeedImage(image, altText, photoIndex, 0, { mobile })}
          ${badgeLabel ? `<span class="live-photo-badge" aria-label="${badgeLabel === "LIVE" ? "Live Photo" : "Video"}">${badgeLabel}</span>` : ""}
        </button>
      </div>
    `;
  }

  const previewImages = images.slice(0, 9);
  return `
    <div class="photo-media collage count-${previewImages.length}">
      ${previewImages.map((image, index) => `
        <button type="button" data-photo-index="${photoIndex}" data-image-index="${index}">
          ${renderFeedImage(image, `${altText} ${index + 1}`, photoIndex, index, { mobile })}
          ${isDiaryMotionMedia(image) ? '<i class="multi-motion-dot" aria-label="动态媒体"></i>' : ""}
        </button>
      `).join("")}
      <span class="media-count">${images.length} 张</span>
    </div>
  `;
}

export function prepareFeedImages(root = document) {
  root.querySelectorAll("img.feed-image, video.feed-image, img.secret-progressive-image").forEach((image) => {
    const markLoaded = () => {
      image.classList.add("is-loaded");
      image.closest("button")?.classList.add("media-loaded");
    };
    if (image.tagName === "VIDEO" ? image.readyState >= 2 : image.complete) {
      markLoaded();
      return;
    }
    image.addEventListener(image.tagName === "VIDEO" ? "loadeddata" : "load", markLoaded, { once: true });
    image.addEventListener("error", markLoaded, { once: true });
  });
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
        ${options.signedIn ? `<button class="favorite-photo ${favorite ? "active" : ""}" type="button" data-favorite-index="${index}" aria-pressed="${String(favorite)}">${favorite ? "♥ 已收藏" : "♡ 收藏"}</button>` : ""}
        ${canManage ? `<button class="feature-photo ${photo.is_featured ? "active" : ""}" type="button" data-feature-index="${index}">${photo.is_featured ? "取消精选" : "设为精选"}</button>
          <button class="pin-photo ${photo.is_pinned ? "active" : ""}" type="button" data-pin-index="${index}">${photo.is_pinned ? "取消置顶" : "置顶"}</button>
          <button class="edit-photo" type="button" data-edit-index="${index}" title="编辑日记">编辑</button>
          <button class="delete-photo" type="button" data-delete-index="${index}" title="删除日记">删除</button>` : ""}
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
    if (button.matches("[data-photo-index][data-image-index]")) {
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

export function renderDiaryGalleryCards({ container, photos = [], initialRender = false, ...options }) {
  if (!container) return;
  container.innerHTML = photos.map((photo, index) => buildPhotoCard(photo, index, options)).join("");
  bindGalleryActions(container, photos, options.handlers);
  if (initialRender) requestAnimationFrame(() => container.querySelector(".photo-media")?.scrollIntoView());
  prepareFeedImages(container);
  updateReadMoreHints(container);
}
