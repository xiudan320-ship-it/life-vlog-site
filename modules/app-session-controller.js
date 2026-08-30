import { getInitial } from "./ui-formatters.js";
import { getVipLevel, getVipLevelByRecharge } from "./vip-center.js";

export function createAppSessionController({
  elements,
  state,
  defaults,
  vlogMode,
  photoFavorites,
  controllers,
  backend,
  actions,
  locationTarget = location,
  documentTarget = document,
  health = null,
}) {
  const els = elements;
  let localSessionReady = false;

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function renderLoaded(controller, method) {
    if (!controller?.isLoaded) return;
    controller.get()?.[method]?.();
  }

  function updateAuthUI() {
    const signedIn = Boolean(state.session);
    const needsAccountSync = Boolean(signedIn && state.session.user.id !== state.syncedUserId);
    if (!signedIn) vlogMode.close();
    const displayName = signedIn ? actions.getSessionDisplayName() : "";
    if (signedIn && !state.accountProfile.avatarUrl) {
      state.accountProfile.avatarUrl = actions.loadCachedAvatarUrl(state.session.user.id);
    }
    const localHomeName = signedIn ? actions.loadHomeName(state.session.user.id) : defaults.homeName;
    actions.applyHomeName(localHomeName, {
      persist: false,
      userId: signedIn ? state.session.user.id : null,
    });
    actions.applyFamilyTagline(actions.loadFamilyTagline(), { persist: false });
    actions.applyTheme(actions.loadTheme(signedIn ? state.session.user.id : null), {
      persist: false,
      userId: signedIn ? state.session.user.id : null,
    });
    actions.applyTextScale(actions.loadTextScale(signedIn ? state.session.user.id : "guest"));
    actions.applyMobileFeedLayout(actions.loadMobileFeedLayout(signedIn ? state.session.user.id : "guest"));
    actions.applyMobileSecretLayout(actions.loadMobileSecretLayout(signedIn ? state.session.user.id : "guest"));
    const rechargeTotal = signedIn ? actions.loadRechargeTotal(displayName) : 0;
    state.activeVipLevel = signedIn ? getVipLevelByRecharge(rechargeTotal)?.level || 0 : 0;
    const vip = signedIn && state.activeVipLevel > 0;
    documentTarget.body.classList.toggle("signed-in", signedIn);
    documentTarget.body.classList.toggle("vip-member", vip);
    documentTarget.body.dataset.vipLevel = String(state.activeVipLevel);
    els.composer.hidden = !signedIn;
    els.anniversarySection.hidden = !signedIn;
    els.anniversaryOpen.hidden = !signedIn;
    els.memoryButton.hidden = !signedIn;
    if (els.vlogNav) els.vlogNav.hidden = !signedIn;
    if (els.weeklyReviewOpen) els.weeklyReviewOpen.hidden = !signedIn;
    const timelineTool = documentTarget.querySelector('[data-tool-id="timeline"]');
    if (timelineTool) timelineTool.hidden = !signedIn;
    if (els.secretOpen) els.secretOpen.hidden = !signedIn;
    if (els.thanksOpen) els.thanksOpen.hidden = !signedIn;
    actions.applyToolDockOrder(signedIn ? state.session.user.id : "guest");
    els.authCard.hidden = signedIn;
    els.userMenu.hidden = !signedIn;
    els.notificationButton.hidden = !signedIn;
    els.loginButton.hidden = signedIn;
    els.signupButton.hidden = signedIn;
    els.usernameInput.hidden = signedIn;
    els.passwordInput.hidden = signedIn;
    if (els.inviteCodeInput) els.inviteCodeInput.hidden = signedIn;
    if (!signedIn) controllers.auth?.resetUi?.();
    els.userPopover.hidden = true;
    els.profileName.textContent = displayName;
    els.avatarInitial.textContent = getInitial(displayName);
    actions.renderAccountAvatar(state.accountProfile.avatarUrl, displayName);
    actions.renderSettingsSummary();
    if (signedIn) {
      if (els.thanksForm) {
        actions.setSelectedThanksColor(state.accountProfile.thanksColor || actions.loadThanksColor(state.session.user.id));
      }
      actions.renderExperience(displayName);
    }
    els.vipBadge.hidden = !signedIn;
    els.vipPopoverBadge.hidden = !signedIn;
    els.vipPopoverBadge.textContent = vip
      ? `${localHomeName} ${getVipLevel(state.activeVipLevel).label}`
      : `开通 ${localHomeName} VIP`;
    if (signedIn) actions.renderTopLevelBadge();
    actions.renderVipCenter();
    state.recipes = signedIn && !needsAccountSync ? ensureArray(state.recipes) : [];
    state.wishes = signedIn && !needsAccountSync ? ensureArray(state.wishes) : [];
    state.shoppingItems = signedIn && !needsAccountSync ? ensureArray(state.shoppingItems) : [];
    state.weekendPlans = signedIn ? ensureArray(state.weekendPlans) : [];
    state.anniversaries = signedIn ? ensureArray(state.anniversaries) : [];
    if (needsAccountSync) photoFavorites.reset("loading");
    else if (!signedIn) photoFavorites.reset();
    state.accountDataState = needsAccountSync ? "loading" : signedIn ? state.accountDataState : "idle";
    actions.renderOverview();
    renderLoaded(controllers.recipe, "render");
    renderLoaded(controllers.wishlist, "render");
    renderLoaded(controllers.shopping, "render");
    renderLoaded(controllers.weekend, "render");
    actions.renderAnniversaries();
    if (els.thanksBoard) actions.renderGratitudeNotes();
    actions.renderFoodWheel();
    actions.switchPage(state.activePage);
    actions.setHint(signedIn ? "" : "输入用户名和密码登录。注册新账号需要 xiudan320 给的邀请码。");
    actions.setGlobalStatus("");

    if (!signedIn) {
      void actions.refreshStorage(backend.request, () => false);
      resetSignedOutState();
      actions.renderNotifications();
      actions.renderSettingsSummary();
      actions.applyHomeName(defaults.homeName);
      return;
    }

  }

  function resetSignedOutState() {
    state.cloudSyncAvailable = false;
    state.weekendCloudAvailable = false;
    state.anniversaryCloudAvailable = false;
    state.photoFlagsCloudAvailable = false;
    state.secretCloudAvailable = false;
    state.foodOptionsCloudAvailable = false;
    state.profilePreferencesCloudAvailable = false;
    state.thanksColorCloudAvailable = false;
    state.gratitudeNotes = [];
    state.secretItems = [];
    state.secretFolders = [];
    state.secretDefaultFolderId = "";
    actions.closeSecretFolderContextMenu();
    actions.closeSecretAlbumContextMenu();
    state.secretAlbumContextMenu = null;
    state.notifications = [];
    state.commentReplyToId = null;
    state.familyInfo = null;
    state.familyMembers = [];
    state.familyInvitations = [];
    state.familyMemberMap = new Map();
    controllers.wardrobe?.get?.()?.clear?.();
    state.photoComments = [];
    state.activeDialogPhoto = null;
    state.cloudSyncInFlight = null;
    state.accountDataState = "idle";
    state.syncedUserId = "";
    state.accountProfile = {
      ...defaults.accountProfile,
      foodOptions: [...defaults.accountProfile.foodOptions],
    };
  }

  async function initializeLocalSession() {
    health?.setStartupStage("local-session");
    els.setupToggle.hidden = true;
    els.setupPanel.hidden = true;
    state.cloudDb = backend.createClient();
    actions.ensurePushSettingsPage();

    state.cloudDb.auth.onAuthStateChange((_event, nextSession) => {
      const previousUserId = state.session?.user?.id || "";
      const nextUserId = nextSession?.user?.id || "";
      if (previousUserId !== nextUserId) controllers.secretPin.resetSession();
      state.session = nextSession;
      updateAuthUI();
      actions.renderCachedPhotoFeed(state.session?.user?.id || "public");
      if (localSessionReady) void synchronizeRemoteSession();
    });

    const { data } = await state.cloudDb.auth.getSession();
    state.session = data.session;
    updateAuthUI();
    actions.renderCachedPhotoFeed(state.session?.user?.id || "public");
    actions.syncMobileComposerPlacement();
    controllers.lifecycle.start();
    localSessionReady = true;
    health?.setStartupStage("local-ready");
    return state.session;
  }

  async function synchronizeRemoteSession() {
    health?.setStartupStage("remote-sync");
    const syncTasks = [actions.loadPhotos()];
    if (state.session) {
      syncTasks.push(actions.loadNotifications());
      syncTasks.push(actions.processDiaryUploadQueue());
      syncTasks.push(actions.syncExistingPushSubscription());
      if (state.session.user.id !== state.syncedUserId) {
        state.syncedUserId = state.session.user.id;
        syncTasks.push(actions.synchronizeAccountData());
      }
    }
    const results = await Promise.allSettled(syncTasks);
    const rejected = results.find((result) => result.status === "rejected");
    if (rejected) health?.setSync(rejected.reason?.kind || "unknown", rejected.reason?.status);
    else if (state.session) health?.setSync("ok", 200);
    const params = new URLSearchParams(locationTarget.search);
    if (params.has("pushPhoto") || params.has("pushType")) void actions.openPushDestination();
  }

  return { initializeLocalSession, synchronizeRemoteSession, updateAuthUI };
}
