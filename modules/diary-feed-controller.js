import {
  filterDiaryEntries,
  isDiaryWithinDays,
  normalizeDiarySearchText,
  sortDiaryEntries,
} from "./diary-domain.js";
import { filterVlogPhotos } from "./vlog-mode.js";
import {
  getDiaryGalleryEmptyState,
  renderDiaryGalleryCards,
} from "./diary-gallery-view.js";
import {
  getDiaryMediaType,
  parseDiaryStoredImages,
  stripDiaryMediaMetadata,
} from "./media-metadata.js";
import { escapeHtml, formatDate, formatDateTime } from "./ui-formatters.js";

export function createDiaryFeedController({
  elements,
  state,
  constants,
  demoPhotos,
  diaryRepository,
  notificationRepository,
  photoFavorites,
  isFavoritePhoto,
  renderCachedPhotoFeed,
  savePhotoFeedCache,
  setGlobalStatus,
  updateCloudSyncStatus,
  loadNotifications,
  renderNotifications,
  switchPage,
  getLocalDateKey,
  getPhotoLabel,
  getAuthorName,
  renderOverview,
  renderAvatarMarkup,
  isAdminAccount,
  isMobileViewport,
  getPhotoOwnerId,
  getDisplayTitle,
  openPhoto,
  deletePhoto,
  openEditPhoto,
  adminUpdatePhotoCategory,
  renderMobileDiaryPage,
  isMissingCloudSchema,
}) {
  const els = elements;
  const {
    todayPostsSeenKey,
    photoCommentPreviewLimit,
    pageSize,
  } = constants;

  async function loadPhotosInternal() {
    if (!state.cloudDb) {
      state.photos = demoPhotos;
      renderGallery();
      return;
    }
  
    const { data, error } = await diaryRepository.list({
      includePrivate: Boolean(state.session),
    });
  
    if (error) {
      if (!navigator.onLine || /failed to fetch|network/i.test(error.message || "")) {
        renderCachedPhotoFeed(state.session?.user?.id || "public");
        setGlobalStatus("当前离线，正在显示本机缓存。");
      } else {
        setGlobalStatus(`读取日记失败：${error.message}`);
        if (!state.photos.length) state.photos = [];
      }
      state.photoFlagsCloudAvailable = false;
      if (state.session) photoFavorites.markError();
    } else {
      setGlobalStatus("");
      state.photos = data || [];
      state.pendingNewPhotos = [];
      state.dismissedFeedRefreshIds = new Set();
      state.showingCachedFeed = false;
      if (state.session) {
        await Promise.all([
          verifyPhotoFlagSchema(),
          photoFavorites.synchronize(),
          loadPhotoCommentPreviews(),
        ]);
      } else {
        state.photoCommentPreviewMap = new Map();
      }
      savePhotoFeedCache(state.session?.user?.id || "public");
    }
    updateDiarySearchSuggestions();
  
    state.visiblePhotoCount = Math.min(
      Math.max(pageSize, state.visiblePhotoCount || pageSize),
      Math.max(pageSize, state.photos.length)
    );
    renderFeedRefreshNotice();
    renderGallery();
    if (state.cloudSyncAvailable) updateCloudSyncStatus();
  }
  
  async function loadPhotos() {
    if (state.photosLoadPromise) return state.photosLoadPromise;
    state.photosLoadPromise = loadPhotosInternal().finally(() => {
      state.photosLoadPromise = null;
    });
    return state.photosLoadPromise;
  }
  
  async function loadPhotoCommentPreviews() {
    state.photoCommentPreviewMap = new Map();
    if (!state.cloudDb || !state.session) return;
    const { data, error } = await diaryRepository.listCommentPreviews(300);
    if (error) return;
    (data || []).forEach((comment) => {
      const photoId = comment.photo_id;
      if (!photoId) return;
      const list = state.photoCommentPreviewMap.get(photoId) || [];
      if (list.length >= photoCommentPreviewLimit) return;
      list.push(comment);
      state.photoCommentPreviewMap.set(photoId, list);
    });
    state.photoCommentPreviewMap.forEach((list) => {
      list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    });
  }
  
  function getLocalDateKeyFromValue(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
  
  function isPhotoPublishedToday(photo) {
    return getLocalDateKeyFromValue(photo?.created_at) === getLocalDateKey();
  }
  
  function getTodayPostsSeenStorageKey(dateKey = getLocalDateKey()) {
    const userId = state.session?.user?.id || "guest";
    return `${todayPostsSeenKey}:${userId}:${dateKey}`;
  }
  
  function loadTodaySeenPostIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(getTodayPostsSeenStorageKey()) || "[]");
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  }
  
  function saveTodaySeenPostIds(ids) {
    localStorage.setItem(
      getTodayPostsSeenStorageKey(),
      JSON.stringify([...new Set([...ids].map(String))])
    );
  }
  
  function getSortedPhotos(photoList = state.photos) {
    return sortDiaryEntries(photoList);
  }
  
  function getTodayPublishedPhotos() {
    const currentUserId = String(state.session?.user?.id || "");
    return getSortedPhotos(state.photos).filter(
      (photo) => photo.category !== "VLOG" && isPhotoPublishedToday(photo) && String(photo?.user_id || "") !== currentUserId
    );
  }
  
  function getUpcomingWeekendPlans() {
    const today = new Date(`${getLocalDateKey()}T00:00:00`);
    return state.weekendPlans
      .filter((plan) => !plan.done && plan.date)
      .map((plan) => {
        const target = new Date(`${plan.date}T00:00:00`);
        return { plan, days: Math.round((target - today) / 86400000) };
      })
      .filter(({ days }) => days >= 0 && days <= 2)
      .sort((a, b) => a.days - b.days || String(a.plan.title).localeCompare(String(b.plan.title)));
  }
  
  function getWeekendReminderDismissKey() {
    return `life-vlog-weekend-reminder:${state.session?.user?.id || "guest"}:${getLocalDateKey()}`;
  }
  
  function renderWeekendReminderNotice() {
    if (!els.weekendReminderNotice) return;
    const upcoming = state.session ? getUpcomingWeekendPlans() : [];
    const dismissed = localStorage.getItem(getWeekendReminderDismissKey()) === "1";
    if (!upcoming.length || dismissed || state.activePage !== "gallery") {
      els.weekendReminderNotice.hidden = true;
      els.weekendReminderNotice.innerHTML = "";
      return;
    }
    const nearest = upcoming[0];
    const timing = nearest.days === 0 ? "就是今天" : nearest.days === 1 ? "明天" : "后天";
    els.weekendReminderNotice.hidden = false;
    els.weekendReminderNotice.innerHTML = `
      <div>
        <span>Weekend</span>
        <strong>${escapeHtml(timing)}：${escapeHtml(nearest.plan.title || "周末计划")}</strong>
        <p>${upcoming.length > 1 ? `还有 ${upcoming.length - 1} 个临近安排` : escapeHtml(nearest.plan.location || "记得提前准备一下")}</p>
      </div>
      <div>
        <button class="today-posts-primary" type="button" data-open-weekend-reminder>查看计划</button>
        <button type="button" data-dismiss-weekend-reminder>今天不再提醒</button>
      </div>
    `;
    els.weekendReminderNotice.querySelector("[data-open-weekend-reminder]")?.addEventListener("click", () => switchPage("weekend"));
    els.weekendReminderNotice.querySelector("[data-dismiss-weekend-reminder]")?.addEventListener("click", () => {
      localStorage.setItem(getWeekendReminderDismissKey(), "1");
      renderWeekendReminderNotice();
    });
  }
  
  function markTodayPostsViewed(ids) {
    const seen = loadTodaySeenPostIds();
    ids.filter(Boolean).forEach((id) => seen.add(String(id)));
    saveTodaySeenPostIds(seen);
  }
  
  async function acknowledgeViewedDiary(photoId) {
    const id = String(photoId || "");
    if (!id) return;
  
    markTodayPostsViewed([id]);
    state.pendingNewPhotos = state.pendingNewPhotos.filter((photo) => String(photo?.id || "") !== id);
    state.dismissedFeedRefreshIds.add(id);
    renderFeedRefreshNotice();
    updateTodayPostsNotice();
  
    let changed = false;
    state.notifications.forEach((item) => {
      if (item.type === "diary" && String(item.photo_id || "") === id && !item.is_read) {
        item.is_read = true;
        item.just_seen = false;
        changed = true;
      }
    });
    if (changed) renderNotifications();
  
    if (state.cloudDb && state.session && changed) {
      await notificationRepository.markDiaryRead(state.session.user.id, id);
    }
  
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const visibleNotifications = await Promise.resolve(registration?.getNotifications?.() || []).catch(() => []);
      (visibleNotifications || []).forEach((notification) => {
        if (String(notification?.data?.photoId || "") === id) notification.close();
      });
    }
  }
  
  function renderFeedRefreshNotice() {
    if (!els.feedRefreshNotice) return;
    if (state.activePage !== "gallery" || !state.pendingNewPhotos.length) {
      els.feedRefreshNotice.hidden = true;
      els.feedRefreshNotice.innerHTML = "";
      return;
    }
  
    const latest = state.pendingNewPhotos[0];
    els.feedRefreshNotice.hidden = false;
    els.feedRefreshNotice.innerHTML = `
      <div>
        <span>New diary</span>
        <strong>有 ${state.pendingNewPhotos.length} 篇新日记</strong>
        <p>最新：${escapeHtml(getPhotoLabel(latest))} · ${escapeHtml(getAuthorName(latest.user_id))}</p>
      </div>
      <div>
        <button class="today-posts-primary" type="button" data-refresh-feed>点击查看</button>
        <button type="button" data-dismiss-feed-refresh>稍后</button>
      </div>
    `;
    els.feedRefreshNotice
      .querySelector("[data-refresh-feed]")
      ?.addEventListener("click", refreshFeedForNewPhotos);
    els.feedRefreshNotice
      .querySelector("[data-dismiss-feed-refresh]")
      ?.addEventListener("click", () => {
        state.pendingNewPhotos.forEach((photo) => {
          if (photo.id) state.dismissedFeedRefreshIds.add(photo.id);
        });
        state.pendingNewPhotos = [];
        renderFeedRefreshNotice();
      });
  }
  
  async function checkForNewPhotos() {
    if (!state.cloudDb || !state.session || state.feedRefreshCheckInFlight) return;
    if (state.showingCachedFeed) return;
    state.feedRefreshCheckInFlight = true;
    try {
      const currentIds = new Set(state.photos.map((photo) => photo.id).filter(Boolean));
      const { data, error } = await diaryRepository.listRecent(
        "id,user_id,title,category,taken_at,created_at",
        12
      );
      if (error) return;
      state.pendingNewPhotos = (data || []).filter(
        (photo) =>
          photo.id &&
          photo.category !== "VLOG" &&
          String(photo.user_id || "") !== String(state.session.user.id) &&
          !currentIds.has(photo.id) &&
          !state.dismissedFeedRefreshIds.has(photo.id)
      );
      renderFeedRefreshNotice();
    } finally {
      state.feedRefreshCheckInFlight = false;
    }
  }
  
  async function refreshFeedForNewPhotos() {
    const targetId = state.pendingNewPhotos[0]?.id || "";
    state.pendingNewPhotos = [];
    renderFeedRefreshNotice();
    state.activeFilter = "全部";
    updateFilterChips();
    await loadPhotos();
    requestAnimationFrame(() => {
      const target = targetId ? els.gallery.querySelector(`[data-photo-id="${targetId}"]`) : null;
      (target || els.gallery)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  
  function updateTodayPostsNotice() {
    if (!els.todayPostsNotice) return;
    if (state.activePage !== "gallery") {
      els.todayPostsNotice.hidden = true;
      return;
    }
    const todayPhotos = getTodayPublishedPhotos();
    const seen = loadTodaySeenPostIds();
    const unseen = todayPhotos.filter((photo) => photo.id && !seen.has(String(photo.id)));
    if (!unseen.length) {
      els.todayPostsNotice.hidden = true;
      els.todayPostsNotice.innerHTML = "";
      return;
    }
    const latest = unseen[0];
    els.todayPostsNotice.hidden = false;
    els.todayPostsNotice.innerHTML = `
      <div>
        <span>今日新帖</span>
        <strong>今天有 ${unseen.length} 篇新日记</strong>
        <p>最新：${escapeHtml(getPhotoLabel(latest))} · ${escapeHtml(getAuthorName(latest.user_id))}</p>
      </div>
      <div>
        <button class="today-posts-primary" type="button" data-view-today-posts>查看今天</button>
        <button type="button" data-dismiss-today-posts>知道了</button>
      </div>
    `;
    els.todayPostsNotice
      .querySelector("[data-view-today-posts]")
      ?.addEventListener("click", showTodayPosts);
    els.todayPostsNotice
      .querySelector("[data-dismiss-today-posts]")
      ?.addEventListener("click", () => {
        markTodayPostsViewed(unseen.map((photo) => photo.id));
        updateTodayPostsNotice();
      });
  }
  
  function updateFilterChips() {
    els.chips.forEach((item) => item.classList.toggle("active", item.dataset.filter === state.activeFilter));
    els.galleryNav.classList.toggle("active", state.activePage === "gallery" && state.activeFilter !== "VLOG");
    els.vlogNav?.classList.toggle("active", state.activePage === "gallery" && state.activeFilter === "VLOG");
  }
  
  function showTodayPosts() {
    const todayPhotos = getTodayPublishedPhotos();
    if (!todayPhotos.length) return;
    const targetId = todayPhotos[0].id;
    state.activeFilter = "全部";
    updateFilterChips();
    const targetIndex = getSortedPhotos(state.photos).findIndex((photo) => photo.id === targetId);
    state.visiblePhotoCount = Math.max(pageSize, targetIndex + 1);
    markTodayPostsViewed(todayPhotos.map((photo) => photo.id));
    renderGallery();
    requestAnimationFrame(() => {
      const target = targetId
        ? els.gallery.querySelector(`[data-photo-id="${targetId}"]`)
        : null;
      (target || els.gallery)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  
  function renderPhotoCommentPreview(photoId, visibleIndex) {
    const comments = state.photoCommentPreviewMap.get(photoId) || [];
    if (!comments.length) return "";
    const totalText =
      comments.length >= photoCommentPreviewLimit ? `最近 ${comments.length} 条留言` : `${comments.length} 条留言`;
    return `
      <section class="photo-card-comments">
        <header>
          <span>${totalText}</span>
          <button type="button" data-open-comments-index="${visibleIndex}">回复</button>
        </header>
        ${comments
          .map(
            (comment) => `
              <article>
                ${renderAvatarMarkup(comment.user_id, "photo-card-comment-avatar")}
                <div>
                  <strong>${escapeHtml(getAuthorName(comment.user_id))}</strong>
                  <p>${escapeHtml(comment.body)}</p>
                </div>
              </article>
            `
          )
          .join("")}
      </section>
    `;
  }
  
  async function verifyPhotoFlagSchema() {
    if (!state.cloudDb || !state.session) {
      state.photoFlagsCloudAvailable = false;
      return;
    }
    const { error } = await diaryRepository.verifyFlags();
    state.photoFlagsCloudAvailable = !error;
  }
  
  function renderGallery() {
    renderOverview();
    updateTodayPostsNotice();
    const sortedPhotos = getSortedPhotos(state.photos);
    const categoryFiltered = filterVlogPhotos(
      sortedPhotos,
      state.activeFilter,
      isFavoritePhoto,
      isPhotoWithinSevenDays
    );
    const filtered = filterPhotosBySearch(categoryFiltered);
  
    state.filteredPhotoCount = filtered.length;
    state.visiblePhotoCount = Math.min(
      Math.max(pageSize, state.visiblePhotoCount),
      Math.max(pageSize, state.filteredPhotoCount)
    );
    const visible = filtered.slice(0, state.visiblePhotoCount);
    const p=!state.galleryRenderSignature;
    const nextSignature = JSON.stringify({
      filter: state.activeFilter,
      search: state.diarySearchQuery,
      layout: document.body.dataset.mobileFeedLayout || "",
      visible: state.visiblePhotoCount,
      favorites: photoFavorites.sortedIds(),
      photos: visible.map((photo) => [photo.id, photo.updated_at, photo.is_featured, photo.is_pinned, getPhotoImages(photo).length]),
      comments: visible.map((photo) => (state.photoCommentPreviewMap.get(photo.id) || []).map((comment) => [comment.id, comment.updated_at, comment.body])),
    });
    if (nextSignature === state.galleryRenderSignature && els.gallery.childElementCount) {
      updateFeedLoader(state.filteredPhotoCount);
      return;
    }
    if (!visible.length) {
      const empty = getDiaryGalleryEmptyState({
        search: state.diarySearchQuery,
        filter: state.activeFilter,
        signedIn: Boolean(state.session),
        favoriteStatus: photoFavorites.status,
      });
      els.gallery.innerHTML = `<div class="empty"${empty.loading ? " data-favorite-sync-loading role=\"status\"" : ""}>${empty.message}</div>`;
      updateFeedLoader(0);
      return;
    }
  
    state.galleryRenderSignature = nextSignature;
    renderDiaryGalleryCards({
      container: els.gallery,
      photos: visible,
      initialRender: p,
      signedIn: Boolean(state.session),
      currentUserId: state.session?.user?.id || "",
      admin: isAdminAccount(),
      mobile: isMobileViewport(),
      getPhotoOwnerId,
      getDisplayTitle,
      getPhotoImages,
      getPlainNote,
      getAuthorName,
      renderAvatar: renderAvatarMarkup,
      renderCommentPreview: renderPhotoCommentPreview,
      isFavorite: isFavoritePhoto,
      handlers: {
        open: openPhoto,
        delete: deletePhoto,
        favorite: togglePhotoFavorite,
        flag: togglePhotoFlag,
        edit: openEditPhoto,
        adminCategory: adminUpdatePhotoCategory,
      },
    });
    observeGalleryMasonry();
    layoutGalleryMasonry();
    warmUpcomingFeedImages(filtered, visible.length);
    updateFeedLoader(filtered.length);
  }
  
  function layoutGalleryMasonry() {
    if (!els.gallery || els.gallery.hidden) return;
    const cards = [...els.gallery.querySelectorAll(".photo-card")];
    if (!cards.length) return;
    const styles = window.getComputedStyle(els.gallery);
    const columnCount = styles.gridTemplateColumns.split(" ").filter(Boolean).length;
    if (columnCount < 2) {
      cards.forEach((card) => card.style.removeProperty("--masonry-span"));
      return;
    }
    const rowHeight = Number.parseFloat(styles.getPropertyValue("grid-auto-rows")) || 8;
    const gap = Number.parseFloat(styles.getPropertyValue("row-gap")) || 24;
    window.requestAnimationFrame(() => {
      cards.forEach((card) => {
        const height = card.getBoundingClientRect().height;
        const span = Math.max(1, Math.ceil((height + gap) / (rowHeight + gap)));
        card.style.setProperty("--masonry-span", String(span));
      });
    });
  }
  
  function scheduleGalleryMasonryLayout() {
    window.clearTimeout(state.galleryMasonryTimer);
    state.galleryMasonryTimer = window.setTimeout(layoutGalleryMasonry, 60);
  }
  
  function ensurePullRefreshIndicator() {
    let indicator = document.querySelector("#pullRefreshIndicator");
    if (indicator) return indicator;
    indicator = document.createElement("div");
    indicator.id = "pullRefreshIndicator";
    indicator.className = "pull-refresh-indicator";
    indicator.innerHTML = `<i></i><span>下拉刷新</span>`;
    document.body.append(indicator);
    return indicator;
  }
  
  function initializePullToRefresh() {
    const indicator = ensurePullRefreshIndicator();
    document.addEventListener("touchstart", (event) => {
      if (!isMobileViewport() || state.activePage !== "gallery" || window.scrollY > 2 || state.mobileDiaryPhoto || event.touches.length !== 1) return;
      if (event.target.closest("dialog, input, textarea, select, .photo-media, .tool-dock")) return;
      const touch = event.touches[0];
      state.pullRefreshState = { x: touch.clientX, y: touch.clientY, distance: 0, tracking: false };
    }, { passive: true });
    document.addEventListener("touchmove", (event) => {
      if (!state.pullRefreshState || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dy = touch.clientY - state.pullRefreshState.y;
      const dx = Math.abs(touch.clientX - state.pullRefreshState.x);
      if (dy <= 0 || dx > dy * .8) {
        state.pullRefreshState = null;
        return;
      }
      if (dy < 8) return;
      state.pullRefreshState.tracking = true;
      state.pullRefreshState.distance = Math.min(110, dy * .55);
      event.preventDefault();
      const ready = state.pullRefreshState.distance >= 64;
      indicator.classList.add("visible");
      indicator.classList.toggle("ready", ready);
      indicator.style.setProperty("--pull-y", `${state.pullRefreshState.distance}px`);
      indicator.querySelector("span").textContent = ready ? "松开刷新" : "下拉刷新";
    }, { passive: false });
    document.addEventListener("touchend", async () => {
      if (!state.pullRefreshState) return;
      const shouldRefresh = state.pullRefreshState.tracking && state.pullRefreshState.distance >= 64;
      state.pullRefreshState = null;
      if (!shouldRefresh) {
        indicator.classList.remove("visible", "ready");
        indicator.style.removeProperty("--pull-y");
        return;
      }
      indicator.classList.add("refreshing");
      indicator.querySelector("span").textContent = "正在刷新";
      try {
        await Promise.all([loadPhotos(), loadNotifications()]);
        indicator.querySelector("span").textContent = "已更新";
      } finally {
        window.setTimeout(() => {
          indicator.classList.remove("visible", "ready", "refreshing");
          indicator.style.removeProperty("--pull-y");
        }, 420);
      }
    }, { passive: true });
    document.addEventListener("touchcancel", () => {
      state.pullRefreshState = null;
      indicator.classList.remove("visible", "ready", "refreshing");
      indicator.style.removeProperty("--pull-y");
    }, { passive: true });
  }
  
  function observeGalleryMasonry() {
    state.galleryMasonryObserver?.disconnect();
    if (!("ResizeObserver" in window) || !els.gallery) return;
    state.galleryMasonryObserver = new ResizeObserver(scheduleGalleryMasonryLayout);
    els.gallery.querySelectorAll(".photo-card").forEach((card) => {
      state.galleryMasonryObserver.observe(card);
    });
  }
  
  function getPhotoSearchText(photo) {
    return [
      getDisplayTitle(photo),
      getPlainNote(photo),
      photo.category,
      photo.taken_at,
      photo.created_at,
      formatDate(photo.taken_at),
      formatDateTime(photo.created_at),
      getAuthorName(photo.user_id),
    ]
      .map(normalizeDiarySearchText)
      .join(" ");
  }
  
  function updateDiarySearchSuggestions() {
    const list = document.querySelector("#diarySearchSuggestions");
    if (!list) return;
    const values = new Set();
    state.photos.forEach((photo) => {
      const title = getDisplayTitle(photo);
      if (title) values.add(title);
      if (photo.category) values.add(photo.category);
      const date = formatDate(photo.taken_at || photo.created_at);
      if (date) values.add(date);
    });
    list.innerHTML = [...values].slice(0, 100).map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
  }
  
  function filterPhotosBySearch(photoList) {
    return filterDiaryEntries(photoList, state.diarySearchQuery, getPhotoSearchText);
  }
  
  function updateDiarySearchUi() {
    if (els.diarySearchInput && els.diarySearchInput.value !== state.diarySearchQuery) {
      els.diarySearchInput.value = state.diarySearchQuery;
    }
    if (els.clearDiarySearch) {
      els.clearDiarySearch.hidden = !state.diarySearchQuery;
    }
  }
  
  function isPhotoWithinSevenDays(photo) {
    return isDiaryWithinDays(photo, 7);
  }
  
  async function togglePhotoFlag(photo, field, { adminUnpin = false } = {}) {
    const photoOwnerId = getPhotoOwnerId(photo);
    const canAdminUnpin = Boolean(
      adminUnpin &&
        field === "is_pinned" &&
        state.session &&
        isAdminAccount() &&
        photo?.is_pinned
    );
    if (
      !state.cloudDb ||
      !state.session ||
      !photo ||
      (photoOwnerId && photoOwnerId !== state.session.user.id && !canAdminUnpin)
    ) return;
    const label = field === "is_pinned" ? "置顶" : "精选";
    if (!state.photoFlagsCloudAvailable) await verifyPhotoFlagSchema();
    if (!state.photoFlagsCloudAvailable) {
      setGlobalStatus(`Cloudflare D1 尚未启用${label}字段，请先部署最新版数据库结构。`);
      return;
    }
    const nextValue = canAdminUnpin ? false : !Boolean(photo[field]);
    setGlobalStatus(`正在更新${label}状态...`);
  
    const result = canAdminUnpin
      ? await diaryRepository.updateAdminUnpin(photo.id, {
          select: "id,is_featured,is_pinned",
          single: true,
        })
      : await diaryRepository.updateOwned(
          photo.id,
          { [field]: nextValue },
          { select: "id,is_featured,is_pinned", single: true }
        );
    const { data, error } = result;
  
    if (error) {
      setGlobalStatus(
        isMissingCloudSchema(error)
          ? `请先部署最新版 Cloudflare D1 结构，再使用${label}功能。`
          : `${label}更新失败：${error.message}`
      );
      return;
    }
  
    Object.assign(photo, data || { is_pinned: false });
    setGlobalStatus(nextValue ? `已设为${label}。` : `已取消${label}。`);
    renderGallery();
    if (state.mobileDiaryPhoto?.id === photo.id && !state.mobileDiaryPage?.hidden) {
      renderMobileDiaryPage();
    }
  }
  
  async function togglePhotoFavorite(photo, button) {
    if (!state.session || !photo) {
      setGlobalStatus("登录后可以收藏日记。");
      return;
    }
  
    if (!photo.id) return;
    if (button) button.disabled = true;
    const { favorite: nextFavorite, error } = await photoFavorites.toggle(photo.id);
  
    if (error) {
      if (button) button.disabled = false;
      setGlobalStatus(
        isMissingCloudSchema(error)
          ? "收藏表尚未启用，请先部署最新版 Cloudflare D1 结构。"
          : `收藏更新失败：${error.message}`
      );
      return;
    }
  
    if (button) button.disabled = false;
    if (button) {
      button.classList.toggle("active", nextFavorite);
      button.classList.toggle("is-active", nextFavorite);
      button.setAttribute("aria-pressed", String(nextFavorite));
      button.innerHTML = button.hasAttribute("data-mobile-diary-favorite")
        ? `<span class="mobile-diary-action-mark" aria-hidden="true">${nextFavorite ? "♥" : "♡"}</span><span>${nextFavorite ? "已收藏" : "收藏"}</span>`
        : `${nextFavorite ? "♥ 已收藏" : "♡ 收藏"}`;
    }
    setGlobalStatus(nextFavorite ? "已收藏。" : "已取消收藏。");
    renderGallery();
  }
  
  function warmUpcomingFeedImages(filteredPhotos, startIndex) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (isMobileViewport() || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "")) return;
    const upcoming = filteredPhotos.slice(startIndex, startIndex + pageSize);
    if (!upcoming.length) return;
  
    const preload = () => {
      upcoming.forEach((photo) => {
        const image = getPhotoImages(photo)[0];
        const source = image?.thumbnail_url || image?.image_url;
        if (!source) return;
        const preloader = new Image();
        preloader.decoding = "async";
        preloader.src = source;
      });
    };
  
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preload, { timeout: 1200 });
      return;
    }
  
    window.setTimeout(preload, 80);
  }
  
  function getPhotoImages(photo) {
    const storedImages = parseDiaryStoredImages(photo.note);
    const primary = {
      type: photo.type || (photo.motion_url ? "live" : photo.video_url ? "video" : "image"),
      image_url: photo.image_url,
      image_path: photo.image_path || "",
      width: photo.width ?? null,
      height: photo.height ?? null,
      thumbnail_url: photo.thumbnail_url || "",
      thumbnail_path: photo.thumbnail_path || "",
      motion_url: photo.motion_url || "",
      motion_path: photo.motion_path || "",
      motion_type: photo.motion_type || "",
      video_url: photo.video_url || "",
      video_path: photo.video_path || "",
      video_type: photo.video_type || "",
      poster_url: photo.poster_url || photo.image_url || "",
      poster_path: photo.poster_path || photo.image_path || "",
    };
    const images = storedImages.length ? storedImages : [primary];
    const seen = new Set();
  
    return images
      .map((image) => ({
        type: getDiaryMediaType(image),
        image_url: image.image_url || image.poster_url || image.posterUrl || image.url,
        image_path: image.image_path || image.path || "",
        width: image.width ?? null,
        height: image.height ?? null,
        thumbnail_url: image.thumbnail_url || image.thumb_url || "",
        thumbnail_path: image.thumbnail_path || image.thumb_path || "",
        motion_url: image.motion_url || image.motionUrl || "",
        motion_path: image.motion_path || image.motionPath || "",
        motion_type: image.motion_type || image.motionType || "",
        video_url: image.video_url || image.videoUrl || "",
        video_path: image.video_path || image.videoPath || "",
        video_type: image.video_type || image.videoType || "",
        poster_url: image.poster_url || image.posterUrl || image.image_url || image.url || "",
        poster_path: image.poster_path || image.posterPath || image.image_path || image.path || "",
      }))
      .filter((image) => image.image_url)
      .filter((image) => {
        if (seen.has(image.image_url)) return false;
        seen.add(image.image_url);
        return true;
      });
  }
  
  function getPlainNote(photo) {
    return stripDiaryMediaMetadata(photo.note || "");
  }
  
  function updateFeedLoader(totalItems) {
    if (!els.feedLoader) return;
    els.feedLoader.hidden = state.activePage !== "gallery" || totalItems === 0;
    if (els.feedLoader.hidden) return;
  
    const hasMore = state.visiblePhotoCount < totalItems;
    els.feedLoader.classList.toggle("complete", !hasMore);
    els.feedLoaderText.textContent = hasMore
      ? `继续下滑加载 · ${Math.min(state.visiblePhotoCount, totalItems)} / ${totalItems}`
      : `已经到底了 · 共 ${totalItems} 篇`;
  }
  
  function initializeFeedObserver() {
    if (!els.feedLoader || state.feedObserver) return;
    state.feedObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          !entry?.isIntersecting ||
          state.feedLoading ||
          state.activePage !== "gallery" ||
          state.visiblePhotoCount >= state.filteredPhotoCount
        ) {
          return;
        }
  
        state.feedLoading = true;
        els.feedLoader.classList.add("loading");
        state.visiblePhotoCount = Math.min(
          state.visiblePhotoCount + pageSize,
          state.filteredPhotoCount
        );
        renderGallery();
        state.feedLoading = false;
        els.feedLoader.classList.remove("loading");
      },
      { rootMargin: "1200px 0px 900px", threshold: 0.01 }
    );
    state.feedObserver.observe(els.feedLoader);
  }
  
  
  return {
    loadPhotos,
    loadPhotoCommentPreviews,
    getLocalDateKeyFromValue,
    isPhotoPublishedToday,
    getTodayPostsSeenStorageKey,
    loadTodaySeenPostIds,
    saveTodaySeenPostIds,
    getSortedPhotos,
    getTodayPublishedPhotos,
    getUpcomingWeekendPlans,
    getWeekendReminderDismissKey,
    renderWeekendReminderNotice,
    markTodayPostsViewed,
    acknowledgeViewedDiary,
    renderFeedRefreshNotice,
    checkForNewPhotos,
    refreshFeedForNewPhotos,
    updateTodayPostsNotice,
    updateFilterChips,
    showTodayPosts,
    renderPhotoCommentPreview,
    verifyPhotoFlagSchema,
    renderGallery,
    layoutGalleryMasonry,
    scheduleGalleryMasonryLayout,
    ensurePullRefreshIndicator,
    initializePullToRefresh,
    observeGalleryMasonry,
    getPhotoSearchText,
    updateDiarySearchSuggestions,
    filterPhotosBySearch,
    updateDiarySearchUi,
    isPhotoWithinSevenDays,
    togglePhotoFlag,
    togglePhotoFavorite,
    warmUpcomingFeedImages,
    getPhotoImages,
    getPlainNote,
    updateFeedLoader,
    initializeFeedObserver,
  };
}
