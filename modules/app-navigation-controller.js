import { parseRoute, serializeRoute } from "./app-route-domain.js";

const PAGE_NAMES = new Set([
  "recipes",
  "wishlist",
  "weekend",
  "wardrobe",
  "thanks",
  "secret",
]);

export function createAppNavigationController({
  elements,
  state,
  vlogMode,
  controllers,
  actions,
  routeLoader,
  routeContext = {},
  documentTarget = document,
  windowTarget = window,
} = {}) {
  const pageScrollPositions = new Map();
  let transitionSequence = 0;

  function getScrollTop() {
    return Math.max(0, Number(windowTarget?.scrollY) || 0);
  }

  function getMaxScrollTop() {
    const documentElement = documentTarget?.documentElement;
    const body = documentTarget?.body;
    const scrollHeight = Math.max(
      Number(documentElement?.scrollHeight) || 0,
      Number(body?.scrollHeight) || 0
    );
    const viewportHeight = Number(windowTarget?.innerHeight) || Number(documentElement?.clientHeight) || 0;
    return Math.max(0, scrollHeight - viewportHeight);
  }

  function rememberScrollPosition(page) {
    if (!page) return;
    pageScrollPositions.set(page, getScrollTop());
  }

  function syncPageNavigationState() {
    const entries = [
      ["gallery", elements.galleryNav],
      ["recipes", elements.recipesNav],
      ["wishlist", elements.wishlistNav],
      ["weekend", elements.weekendNav],
      ["wardrobe", elements.wardrobeNav],
      ["thanks", elements.thanksNav],
      ["secret", elements.secretNav],
    ];
    for (const [page, navigation] of entries) {
      if (!navigation) continue;
      const isGallery = page === "gallery";
      const isCurrent = page === state.activePage;
      navigation.classList.toggle(
        "active",
        isGallery
          ? isCurrent && state.activeFilter !== "VLOG"
          : isCurrent
      );
      if (isCurrent) navigation.setAttribute("aria-current", "page");
      else navigation.removeAttribute("aria-current");
    }
    elements.vlogNav?.removeAttribute("aria-current");
    elements.vlogNav?.classList.toggle(
      "active",
      state.activePage === "gallery" && state.activeFilter === "VLOG"
    );
  }

  function focusPageHeading(page) {
    const heading = documentTarget?.querySelector?.(`[data-page-heading="${page}"]`);
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus?.({ preventScroll: true });
  }

  function finishPageTransition(page, { restoreScroll = true, focusHeading = true } = {}) {
    if (restoreScroll && typeof windowTarget?.scrollTo === "function") {
      const savedPosition = pageScrollPositions.get(page) ?? 0;
      const boundedPosition = Math.min(savedPosition, getMaxScrollTop());
      windowTarget.scrollTo({ top: boundedPosition, behavior: "instant" });
    }
    if (focusHeading) focusPageHeading(page);
  }

  function schedulePageTransition(page, options) {
    const isCurrent = options?.isCurrent || (() => true);
    const finish = () => {
      if (isCurrent()) finishPageTransition(page, options);
    };
    if (typeof windowTarget?.requestAnimationFrame === "function") {
      windowTarget.requestAnimationFrame(finish);
      return;
    }
    finish();
  }

  function syncMobilePageShell() {
    documentTarget?.body?.classList.toggle(
      "mobile-diary-shell",
      state.activePage === "gallery" && state.activeFilter !== "VLOG"
    );
  }

  async function switchPage(
    page,
    { skipSecretGate = false, restoreScroll = true, focusHeading = true, historyMode = "push" } = {}
  ) {
    const requestedPage = PAGE_NAMES.has(page) ? page : "gallery";
    const transitionId = ++transitionSequence;
    const isCurrent = () => transitionId === transitionSequence;
    if (requestedPage === "secret" && !skipSecretGate && !actions.isSecretUnlocked()) {
      elements.main?.removeAttribute("aria-busy");
      elements.main?.removeAttribute("data-route-busy");
      actions.openSecretPinDialog();
      return false;
    }
    const previousPage = state.activePage;
    const pageChanged = previousPage !== requestedPage;
    if (pageChanged) rememberScrollPosition(previousPage);
    elements.main?.setAttribute("aria-busy", "true");
    elements.main?.setAttribute("data-route-busy", "true");
    try {
      await routeLoader?.load(requestedPage, {
        ...routeContext,
        state,
        actions,
        controllers,
        isCurrent,
      });
      if (!isCurrent()) return false;
      routeContext.health?.setRoute(requestedPage);
      routeContext.performanceMonitor?.mark(`route-loaded:${requestedPage}`);
      if (previousPage === "gallery" && requestedPage !== "gallery") actions.setUploadExpanded(false);
      if (requestedPage !== "gallery") vlogMode.close();
      const enteringSecret = state.activePage !== "secret" && requestedPage === "secret";
      if (previousPage === "secret" && requestedPage !== "secret") actions.markSecretLeft();
      actions.closeMobileDiaryPage();
      state.activePage = requestedPage;
      syncMobilePageShell();
      if (enteringSecret) {
        state.activeSecretAlbumId = "";
        state.activeSecretFolderId = actions.getSecretDefaultFolderId();
        state.secretSelectionMode = false;
        state.selectedSecretImageIndexes.clear();
      }

      const showRecipes = state.activePage === "recipes";
      const showWishlist = state.activePage === "wishlist";
      const showWeekend = state.activePage === "weekend";
      const showWardrobe = state.activePage === "wardrobe";
      const showThanks = state.activePage === "thanks";
      const showSecret = state.activePage === "secret";
      syncPageNavigationState();
      elements.composer.hidden = state.activePage !== "gallery" || !state.session;
      elements.overview.hidden = state.activePage !== "gallery" || !state.session;
      elements.foodWheelSection.hidden = !state.session;
      elements.galleryHead.hidden = state.activePage !== "gallery";
      elements.feedRefreshNotice.hidden = state.activePage !== "gallery" || !state.pendingNewPhotos.length;
      elements.todayPostsNotice.hidden = state.activePage !== "gallery";
      actions.renderWeekendReminderNotice();
      elements.galleryFilters.hidden = state.activePage !== "gallery";
      elements.gallery.hidden = state.activePage !== "gallery";
      if (state.activePage !== "gallery") elements.feedLoader.hidden = true;
      if (elements.recipesPage) elements.recipesPage.hidden = !showRecipes;
      if (elements.wishlistPage) elements.wishlistPage.hidden = !showWishlist;
      if (elements.weekendPage) elements.weekendPage.hidden = !showWeekend;
      if (elements.wardrobePage) elements.wardrobePage.hidden = !showWardrobe;
      if (elements.thanksPage) elements.thanksPage.hidden = !showThanks;
      if (elements.secretPage) elements.secretPage.hidden = !showSecret;
      if (elements.recipeComposer) elements.recipeComposer.hidden = !showRecipes || !state.session;
      if (elements.wishlistComposer) elements.wishlistComposer.hidden = !showWishlist || !state.session;
      if (elements.shoppingComposer) elements.shoppingComposer.hidden = !showWishlist || !state.session;
      if (elements.weekendComposer) elements.weekendComposer.hidden = !showWeekend || !state.session;
      if (elements.thanksForm) elements.thanksForm.hidden = !showThanks || !state.session;
      if (elements.secretComposer) elements.secretComposer.hidden = !showSecret || !state.session;

      if (state.activePage === "gallery") {
        if (state.session && !actions.isAdminAccount()) actions.setGlobalStatus("");
        actions.renderFeedRefreshNotice();
        actions.renderGallery();
        actions.updateFeedLoader(state.filteredPhotoCount);
      }
      if (pageChanged && historyMode === "push") windowTarget.history.pushState({}, "", serializeRoute(requestedPage, windowTarget.location.href));
      if (!pageChanged && historyMode === "replace") windowTarget.history.replaceState({}, "", serializeRoute(requestedPage, windowTarget.location.href));
      if (pageChanged) schedulePageTransition(requestedPage, { restoreScroll, focusHeading, isCurrent });
      return true;
    } catch (error) {
      if (!isCurrent()) return false;
      state.activePage = previousPage;
      syncPageNavigationState();
      const offline = windowTarget.navigator?.onLine === false
        || /fetch|network|offline/i.test(String(error?.message || ""));
      actions.setGlobalStatus(
        offline
          ? "当前离线，这个页面尚未缓存；联网后重试即可。"
          : `页面加载失败：${error?.message || "请重试"}`
      );
      return false;
    } finally {
      if (isCurrent()) {
        elements.main?.removeAttribute("aria-busy");
        elements.main?.removeAttribute("data-route-busy");
      }
    }
  }

  windowTarget.history && (windowTarget.history.scrollRestoration = "manual");
  windowTarget.addEventListener?.("popstate", () => {
    void switchPage(parseRoute(windowTarget.location).page, { historyMode: "none" });
  });

  function getMemoryPhotos() {
    if (!state.session) return [];
    return state.photos.filter(
      (photo) =>
        photo.category !== "VLOG" &&
        (photo?.image_url || actions.getPhotoImages(photo).length)
    );
  }

  function renderOverview() {
    if (!elements.overview) return;
    const signedIn = Boolean(state.session);
    elements.overview.hidden = !signedIn || state.activePage !== "gallery";
    if (!signedIn) return;

    const familyVisiblePhotos = getMemoryPhotos();
    const unfinishedWishes = state.wishes.filter((wish) => !wish.done).length;
    const experience = actions.loadExperience();
    const progress = actions.getExperienceLevel(experience.total);
    elements.overviewPhotos.textContent = String(familyVisiblePhotos.length);
    elements.overviewRecipes.textContent = String(state.recipes.length);
    elements.overviewWishes.textContent = String(unfinishedWishes);
    elements.overviewLevel.textContent = progress.title;
    elements.overviewProgress.style.width = `${progress.percent}%`;
    elements.memoryButton.disabled = familyVisiblePhotos.length === 0;
  }

  function openRandomMemory() {
    const memoryPhotos = getMemoryPhotos();
    if (!memoryPhotos.length) return;
    const currentId = state.activeDialogPhoto?.id;
    const candidates =
      memoryPhotos.length > 1
        ? memoryPhotos.filter((photo) => photo.id !== currentId)
        : memoryPhotos;
    const randomPhoto = candidates[Math.floor(Math.random() * candidates.length)];
    actions.openPhoto(randomPhoto, 0, { randomMode: true });
  }

  return { getMemoryPhotos, openRandomMemory, renderOverview, switchPage };
}
