import { bindContentFormEvents } from "./content-form-event-bindings.js";
import { bindMediaEvents } from "./media-event-bindings.js";
import { bindSettingsEvents } from "./settings-event-bindings.js?v=20260826-001";

export function bindAppEvents({
  elements,
  state,
  pageSize,
  controllers,
  vlogMode,
  core,
}) {
  const els = elements;
  const {
    saveConfig,
    switchPage,
    openRandomMemory,
  } = core;
  const {
    handleToolDockClick,
    startToolDockPointer,
    moveToolDockPointer,
    finishToolDockPointer,
    exitToolDockTouchSort,
  } = controllers.toolDock;
  const { openWeeklyReview } = controllers.familyActivity;
  const { toggleTheme } = controllers.profilePreferences;
  const {
    appendDigit: appendSecretPinDigit,
    deleteDigit: deleteSecretPinDigit,
  } = controllers.secretPin;
  const secretPinController = controllers.secretPin;
  const {
    beginGlobalMobileBackSwipe,
    moveGlobalMobileBackSwipe,
    finishGlobalMobileBackSwipe,
    cancelGlobalMobileBackSwipe,
  } = controllers.photoDetail;
  const { setExpanded: setUploadExpanded } = controllers.diaryComposer;
  const {
    open: openFoodWheel,
    close: closeFoodWheel,
    spin: spinFoodWheel,
    addOption: addFoodOption,
  } = controllers.foodWheel;
  const {
    render: renderAnniversaries,
    resetForm: resetAnniversaryForm,
    setFormExpanded: setAnniversaryFormExpanded,
    submit: saveAnniversary,
  } = controllers.anniversary;
  const {
    setExpanded: setRecipeExpanded,
  } = controllers.recipe;
  const {
    setExpanded: setWishlistExpanded,
  } = controllers.wishlist;
  const wishlistHubController = controllers.wishlistHub;
  const {
    setExpanded: setWeekendExpanded,
  } = controllers.weekend;
  const { reopenSettingsAfterChildDialog } = controllers.familySettings;
  const {
    login: loginWithPassword,
    resetEmailRecoveryUi,
    signup: signupWithPassword,
  } = controllers.auth;
  const { openLevelDialog } = controllers.gamification;

  els.setupToggle.addEventListener("click", () => {
    els.setupPanel.hidden = !els.setupPanel.hidden;
  });
  els.themeToggle.addEventListener("click", toggleTheme);
  els.galleryNav.addEventListener("click", () => {
    setUploadExpanded(false);
    vlogMode.close();
    switchPage("gallery");
  });
  els.recipesNav?.addEventListener("click", () => {
    switchPage("recipes");
    els.recipesPage?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.recipesToolOpen?.addEventListener("click", () => {
    switchPage("recipes");
    els.recipesPage?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.wishlistNav.addEventListener("click", () => {
    wishlistHubController.showWishlist();
    switchPage("wishlist");
  });
  els.weekendNav.addEventListener("click", () => switchPage("weekend"));
  els.wardrobeNav?.addEventListener("click", () => switchPage("wardrobe"));
  els.thanksNav?.addEventListener("click", () => switchPage("thanks"));
  els.secretNav?.addEventListener("click", () => switchPage("secret"));
  els.brand?.addEventListener("click", (event) => {
    event.preventDefault();
    switchPage("gallery");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  els.toolDock?.addEventListener("click", handleToolDockClick, true);
  els.toolDock?.addEventListener("pointerdown", startToolDockPointer);
  els.toolDock?.addEventListener("pointermove", moveToolDockPointer);
  els.toolDock?.addEventListener("pointerup", finishToolDockPointer);
  els.toolDock?.addEventListener("pointercancel", finishToolDockPointer);
  els.toolDock?.addEventListener("lostpointercapture", finishToolDockPointer);
  document.addEventListener("click", (event) => {
    if (!els.toolDock?.classList.contains("touch-sorting")) return;
    if (els.toolDock.contains(event.target)) return;
    exitToolDockTouchSort();
  });
  document.addEventListener("pointerdown", beginGlobalMobileBackSwipe, { passive: true, capture: true });
  document.addEventListener("pointermove", moveGlobalMobileBackSwipe, { passive: true, capture: true });
  document.addEventListener("pointerup", finishGlobalMobileBackSwipe, { passive: true, capture: true });
  document.addEventListener("pointercancel", cancelGlobalMobileBackSwipe, { passive: true, capture: true });
  els.foodWheelOpen.addEventListener("click", openFoodWheel);
  els.foodWheelClose.addEventListener("click", closeFoodWheel);
  els.foodWheelDialog.addEventListener("click", (event) => {
    if (event.target === els.foodWheelDialog) closeFoodWheel();
  });
  els.spinFoodWheel.addEventListener("click", spinFoodWheel);
  els.addFoodOption.addEventListener("click", addFoodOption);
  els.foodOptionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addFoodOption();
  });
  els.anniversaryOpen.addEventListener("click", () => {
    renderAnniversaries();
    els.anniversaryDialog.showModal();
  });
  els.anniversaryClose.addEventListener("click", () => els.anniversaryDialog.close());
  els.anniversaryDialog.addEventListener("click", (event) => {
    if (event.target === els.anniversaryDialog) els.anniversaryDialog.close();
  });
  els.anniversaryAdd.addEventListener("click", () => {
    const shouldExpand = els.anniversaryForm.hidden;
    if (shouldExpand) resetAnniversaryForm();
    setAnniversaryFormExpanded(shouldExpand);
  });
  els.anniversaryForm.addEventListener("submit", saveAnniversary);
  els.anniversaryCancel.addEventListener("click", () => {
    resetAnniversaryForm();
    setAnniversaryFormExpanded(false);
  });
  els.memoryButton.addEventListener("click", openRandomMemory);
  els.weeklyReviewOpen?.addEventListener("click", openWeeklyReview);
  els.weeklyReviewClose?.addEventListener("click", () => els.weeklyReviewDialog.close());
  els.weeklyReviewDialog?.addEventListener("click", (event) => {
    if (event.target === els.weeklyReviewDialog) els.weeklyReviewDialog.close();
  });
  els.secretOpen?.addEventListener("click", () => {
    if (switchPage("secret")) {
      els.secretPage?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  els.thanksOpen?.addEventListener("click", () => switchPage("thanks"));
  els.secretPinClose?.addEventListener("click", () => els.secretPinDialog?.close());
  els.secretPinDialog?.addEventListener("close", () => {
    reopenSettingsAfterChildDialog();
    secretPinController.resetManageMode();
  });
  els.secretPinDialog?.addEventListener("click", (event) => {
    if (event.target === els.secretPinDialog) els.secretPinDialog.close();
  });
  els.secretPinKeypad?.addEventListener("click", (event) => {
    const digitButton = event.target.closest("[data-secret-pin-digit]");
    if (digitButton) appendSecretPinDigit(digitButton.dataset.secretPinDigit || "");
    if (event.target.closest("[data-secret-pin-delete]")) deleteSecretPinDigit();
  });
  document.addEventListener("keydown", (event) => {
    if (!els.secretPinDialog?.open) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      appendSecretPinDigit(event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      deleteSecretPinDigit();
    }
  });
  els.quickPhoto.addEventListener("click", () => {
    vlogMode.close();
    switchPage("gallery");
    setUploadExpanded(true);
    els.composer.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.quickRecipe.addEventListener("click", () => {
    switchPage("recipes");
    setRecipeExpanded(true);
    els.recipeComposer.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.quickWish.addEventListener("click", () => {
    wishlistHubController.showWishlist();
    switchPage("wishlist");
    setWishlistExpanded(true);
    els.wishlistComposer.scrollIntoView({ behavior: "smooth", block: "start" });
  });
    els.quickWeekend.addEventListener("click", () => {
    switchPage("weekend");
    setWeekendExpanded(true);
    els.weekendComposer.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.overviewLevelButton?.addEventListener("click", openLevelDialog);
  els.xpPanel?.addEventListener("click", openLevelDialog);
  els.saveConfig.addEventListener("click", saveConfig);
  els.loginButton.addEventListener("click", loginWithPassword);
  els.signupButton.addEventListener("click", signupWithPassword);
  els.forgotPasswordButton.addEventListener("click", () => {
    els.forgotPasswordForm.reset();
    resetEmailRecoveryUi();
    els.recoveryUsernameInput.value = els.usernameInput.value.trim();
    els.forgotPasswordStatus.textContent = "";
    els.forgotPasswordDialog.showModal();
    els.resetEmailInput?.focus();
  });
  bindContentFormEvents({ elements, state, controllers });
  bindSettingsEvents({ elements, state, controllers, core });
  bindMediaEvents({ elements, state, pageSize, controllers, vlogMode, core });
  
  
}
