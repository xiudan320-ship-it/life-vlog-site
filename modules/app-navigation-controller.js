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
  documentTarget = document,
  windowTarget = window,
} = {}) {
  const pageScrollPositions = new Map();

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
    const finish = () => finishPageTransition(page, options);
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

  function switchPage(
    page,
    { skipSecretGate = false, restoreScroll = true, focusHeading = true } = {}
  ) {
    const requestedPage = PAGE_NAMES.has(page) ? page : "gallery";
    if (requestedPage === "secret" && !skipSecretGate && !actions.isSecretUnlocked()) {
      actions.openSecretPinDialog();
      return false;
    }
    const previousPage = state.activePage;
    const pageChanged = previousPage !== requestedPage;
    if (pageChanged) rememberScrollPosition(previousPage);
    if (previousPage === "gallery" && requestedPage !== "gallery") {
      actions.setUploadExpanded(false);
    }
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
    elements.feedRefreshNotice.hidden =
      state.activePage !== "gallery" || !state.pendingNewPhotos.length;
    elements.todayPostsNotice.hidden = state.activePage !== "gallery";
    actions.renderWeekendReminderNotice();
    elements.galleryFilters.hidden = state.activePage !== "gallery";
    elements.gallery.hidden = state.activePage !== "gallery";
    if (state.activePage !== "gallery") elements.feedLoader.hidden = true;
    elements.recipesPage.hidden = !showRecipes;
    elements.wishlistPage.hidden = !showWishlist;
    elements.weekendPage.hidden = !showWeekend;
    elements.wardrobePage.hidden = !showWardrobe;
    elements.thanksPage.hidden = !showThanks;
    elements.secretPage.hidden = !showSecret;
    elements.recipeComposer.hidden = !showRecipes || !state.session;
    elements.wishlistComposer.hidden = !showWishlist || !state.session;
    elements.shoppingComposer.hidden = !showWishlist || !state.session;
    elements.weekendComposer.hidden = !showWeekend || !state.session;
    elements.thanksForm.hidden = !showThanks || !state.session;
    elements.secretComposer.hidden = !showSecret || !state.session;

    if (showRecipes) actions.renderRecipes();
    if (showWishlist) controllers.wishlistHub.show(controllers.wishlistHub.getActiveModule());
    if (showWeekend) actions.renderWeekendPlans();
    if (showWardrobe) void controllers.wardrobe.load();
    if (showThanks) actions.renderGratitudeNotes();
    if (showSecret) {
      actions.applyMobileSecretLayout();
      if (!state.secretItems.length && state.session) {
        actions.renderCachedSecretItems(state.session.user.id);
      }
      actions.renderSecretGallery();
      if (state.session && state.cloudDb && Date.now() - state.lastSecretSyncAt > 60_000) {
        void actions.loadSecretItems();
      }
    }
    if (state.activePage === "gallery") {
      if (state.session && !actions.isAdminAccount()) actions.setGlobalStatus("");
      actions.renderFeedRefreshNotice();
      actions.renderGallery();
      actions.updateFeedLoader(state.filteredPhotoCount);
    }
    if (pageChanged) schedulePageTransition(requestedPage, { restoreScroll, focusHeading });
    return true;
  }

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
