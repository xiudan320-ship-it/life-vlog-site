import { escapeHtml } from "./ui-formatters.js";
import { normalizeSecretPhotoTags } from "./secret-domain.js";

export function buildSecretSearchMarkup({ query, scope, albums = [], photos = [], favorites = false }) {
  return `<section class="secret-search-results" aria-label="搜索结果">
    <header class="secret-collection-header"><div><h3>搜索结果</h3><p>在${escapeHtml(scope)}中搜索「${escapeHtml(query)}」 · ${albums.length} 个相册 · ${photos.length} 张图片</p></div><button type="button" data-secret-clear-search>清除搜索</button></header>
    ${!albums.length && !photos.length ? `<div class="empty">没有匹配的相册或图片标签。试试其它关键词，或清除搜索。</div>` : ""}
    ${albums.length ? `<h4>相册名称 / 备注</h4><div class="secret-search-albums">${albums.map((item, index) => `<button type="button" data-secret-search-album="${index}">${escapeHtml(item.title || "未命名相册")} <small>${item.images.length} 张图片 · 打开相册 →</small></button>`).join("")}</div>` : ""}
    ${photos.length ? `<h4>${favorites ? "已收藏图片 · 相册或标签匹配" : "图片标签"}</h4><div class="secret-album-grid">${photos.map(({ item, image }, index) => `<article class="secret-search-photo"><button class="secret-album-photo" type="button" data-secret-search-photo="${index}" aria-label="打开${escapeHtml(item.title)}的图片：${escapeHtml(normalizeSecretPhotoTags(image).join("、"))}"><img class="secret-progressive-image" src="${escapeHtml(image.thumbnail_url || image.image_url)}" alt="${escapeHtml(normalizeSecretPhotoTags(image).join(" · "))}" loading="lazy" /><small class="secret-photo-tag">${escapeHtml(normalizeSecretPhotoTags(image).join(" · "))}</small></button><button class="secret-search-source" type="button" data-secret-search-source="${index}" title="所属相册：${escapeHtml(item.title || "未命名相册")}">相册：${escapeHtml(item.title || "未命名相册")} →</button></article>`).join("")}</div>` : ""}
  </section>`;
}

export function bindSecretSearchActions(container, results, { clear, openAlbum, openPhoto }) {
  container.querySelector("[data-secret-clear-search]")?.addEventListener("click", clear);
  container.querySelectorAll("[data-secret-search-album]").forEach((button) => button.addEventListener("click", () => openAlbum(results.albums[Number(button.dataset.secretSearchAlbum)])));
  container.querySelectorAll("[data-secret-search-photo]").forEach((button) => button.addEventListener("click", () => openPhoto(results.photos[Number(button.dataset.secretSearchPhoto)], button)));
  container.querySelectorAll("[data-secret-search-source]").forEach((button) => button.addEventListener("click", () => openAlbum(results.photos[Number(button.dataset.secretSearchSource)].item)));
}
