import { createFrameScheduler } from "./app-lifecycle.js";
import { stopDiaryMotionVideo } from "./diary-video-layout.js";
import { updateReadMoreHints } from "./diary-gallery-view.js";
import { getClipboardImageUrl } from "./media-metadata.js";

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
    updateNetworkStatus,
    showMiniToast,
    loadHomeName,
    getSessionDisplayName,
    updateDiaryBackTopButton,
    isMobileViewport,
  } = core;
  const {
    handleToolDockClick,
    startToolDockPointer,
    moveToolDockPointer,
    finishToolDockPointer,
    exitToolDockTouchSort,
  } = controllers.toolDock;
  const { openWeeklyReview } = controllers.familyActivity;
  const {
    toggleTheme,
    saveHomeName,
    restoreDefaultHomeName,
    saveProfileNickname,
    setAvatarPreview,
    clearAvatarPreviewUrl,
    updateAvatarPreview,
    saveAvatar,
  } = controllers.profilePreferences;
  const {
    appendDigit: appendSecretPinDigit,
    deleteDigit: deleteSecretPinDigit,
    openSettings: openSecretPinSettings,
  } = controllers.secretPin;
  const secretPinController = controllers.secretPin;
  const {
    adjustDiaryViewerZoom,
    applySecretImageZoom,
    beginDialogBackSwipe,
    beginDialogSwipe,
    beginSecretImageTouch,
    cancelDialogBackSwipe,
    cancelDialogSwipe,
    downloadCurrentDiaryImage,
    endSecretImageTouch,
    finishDialogBackSwipe,
    finishDialogSwipe,
    fitSecretViewerImage,
    handleSecretViewerWheel,
    isFittableImageDialogOpen,
    isSecretImageDialogOpen,
    isSecretImageViewerOpen,
    isZoomableImageDialogOpen,
    moveDialogImage,
    moveDialogSwipe,
    moveSecretImageTouch,
    normalizeSecretImageZoom,
    refreshSecretViewerToolbar,
    renderDialogMedia,
    resetSecretImageZoom,
    setSecretViewerStatus,
    zoomImageViewerAt,
  } = controllers.photoViewer;
  const {
    beginGlobalMobileBackSwipe,
    moveGlobalMobileBackSwipe,
    finishGlobalMobileBackSwipe,
    cancelGlobalMobileBackSwipe,
    closePhotoDialog,
    unlockDialogBackgroundScroll,
    restoreDialogReturnTarget,
    savePhotoEdit,
    replaceEditingImage,
    startAppendEditingImages,
    handleEditImagePaste,
    deletePhotoFromEditor,
    resetEditImageState,
  } = controllers.photoDetail;
  const {
    addSecretImageLinks,
    createSecretFolder,
    getImageFilesFromClipboard,
    handleSecretPaste,
    openSecretLinkedDiary,
    renderSecretGallery,
    renderSecretLinkedPhotoOptions,
    returnToSecretItem,
    saveSecretItem,
    setSecretExpanded,
    toggleDialogImageFullscreen,
    toggleDiaryImageFullscreen,
    updateSecretPreview,
  } = controllers.secret;
  const {
    renderGallery,
    updateFilterChips,
    updateDiarySearchUi,
    scheduleGalleryMasonryLayout,
  } = controllers.diaryFeed;
  const {
    setExpanded: setUploadExpanded,
    processQueue: processDiaryUploadQueue,
  } = controllers.diaryComposer;
  const diaryComposerController = controllers.diaryComposer;
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
    updateCoverPreview: updateRecipeCoverPreview,
    handleCoverPaste: handleRecipeCoverPaste,
    applyCoverUrl: applyRecipeCoverUrl,
    submit: saveRecipe,
    resetForm: resetRecipeForm,
    setStatus: setRecipeStatus,
  } = controllers.recipe;
  const {
    setExpanded: setWishlistExpanded,
    updateImagePreview: updateWishImagePreview,
    handleImagePaste: handleWishImagePaste,
    applyImageUrl: applyWishImageUrl,
    removeImage: removeWishImage,
    submit: saveWish,
    resetForm: resetWishForm,
    setStatus: setWishlistStatus,
    render: renderWishes,
    submitCompletion: submitWishCompletion,
    closeCompleteDialog: closeWishCompleteDialog,
  } = controllers.wishlist;
  const {
    setExpanded: setWeekendExpanded,
    addFiles: addWeekendFiles,
    handleImagePaste: handleWeekendImagePaste,
    addImageLinks: addWeekendImageLinks,
    removeImageEntry: removeWeekendImageEntry,
    submit: saveWeekendPlan,
    resetForm: resetWeekendForm,
    setStatus: setWeekendStatus,
    addCompletionFiles: addWeekendCompletionFiles,
    addCompletionLinks: addWeekendCompletionLinks,
    removeCompletionEntry: removeWeekendCompletionEntry,
    saveCompletion: saveWeekendCompletion,
    closeCompletionDialog: closeWeekendCompletionDialog,
  } = controllers.weekend;
  const {
    submit: saveGratitudeNote,
    resetForm: resetGratitudeForm,
    setSelectedColor: setSelectedThanksColor,
    saveColor: saveThanksColorPreference,
  } = controllers.gratitude;
  const {
    openSettingsDialog,
    closeSettingsDialog,
    setActiveSettingsSection,
    openSettingsChildDialog,
    reopenSettingsAfterChildDialog,
    renderFamilyDialog,
    createFamily,
    addFamilyMember,
  } = controllers.familySettings;
  const {
    openNotificationsPanel,
    savePhotoComment,
    cancelCommentReply,
  } = controllers.social;
  const {
    changePassword,
    confirmEmailBinding,
    confirmEmailPasswordReset,
    login: loginWithPassword,
    logout,
    requestEmailBinding,
    requestEmailPasswordReset,
    resetEmailBindingDialog,
    resetEmailRecoveryUi,
    resetForgottenPassword,
    saveRecoveryKey,
    signup: signupWithPassword,
  } = controllers.auth;
  const {
    clear: clearAppCache,
    refreshInfo: refreshCacheInfo,
    schedule: scheduleOfflineMediaCache,
    shouldAutoCache: shouldAutoCacheMedia,
  } = controllers.offlineCache;
  const {
    changeCacheLimit,
    saveCacheLimitFromDialog,
    applyCacheLimitPreset,
  } = controllers.offlineSettings;
  const {
    loadMobileFeedLayout,
    setMobileFeedLayout,
    syncMobileComposerPlacement,
    updateSecretToolbarTop,
  } = controllers.layoutSettings;
  const {
    openDialog: openLevelDialog,
    openLevelGuidePage,
    renderVipCenter,
  } = controllers.gamification;
  const { openDestination: openPushDestination } = controllers.push;

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
  els.wishlistNav.addEventListener("click", () => switchPage("wishlist"));
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
  els.recipeToggle.addEventListener("click", () => {
    setRecipeExpanded(els.recipeForm.hidden);
  });
  els.recipeCoverInput.addEventListener("change", updateRecipeCoverPreview);
  els.recipeCoverDrop.addEventListener("paste", handleRecipeCoverPaste);
  els.recipeCoverLinkAdd?.addEventListener("click", () => applyRecipeCoverUrl(els.recipeCoverLinkInput?.value));
  els.recipeCoverLinkInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyRecipeCoverUrl(els.recipeCoverLinkInput.value);
    }
  });
  document.addEventListener("paste", (event) => {
    if (event.defaultPrevented || state.activePage !== "recipes" || els.recipeForm.hidden) return;
    const hasImage = Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/"));
    if (!hasImage && event.target !== els.recipeCoverLinkInput && event.target !== els.recipeCoverDrop) return;
    handleRecipeCoverPaste(event);
  });
  document.addEventListener("paste", (event) => {
    if (event.defaultPrevented || !state.session) return;
    const hasImage = Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/"));
    if (state.activePage === "wishlist" && !els.wishlistForm.hidden && (hasImage || event.target === els.wishImageLinkInput)) {
      handleWishImagePaste(event);
    } else if (state.activePage === "weekend" && !els.weekendForm.hidden && (hasImage || event.target === els.weekendImageLinkInput)) {
      handleWeekendImagePaste(event);
    } else if (state.activePage === "secret" && !els.secretForm.hidden && (hasImage || event.target === els.secretImageLinkInput)) {
      handleSecretPaste(event);
    }
  });
  els.recipeForm.addEventListener("submit", saveRecipe);
  els.recipeCancelEdit.addEventListener("click", () => {
    resetRecipeForm();
    setRecipeExpanded(false);
    setRecipeStatus("");
  });
  els.wishlistToggle.addEventListener("click", () => {
    setWishlistExpanded(els.wishlistForm.hidden);
  });
  els.wishImageInput.addEventListener("change", updateWishImagePreview);
  els.wishImageDrop.addEventListener("paste", handleWishImagePaste);
  els.wishImageLinkAdd?.addEventListener("click", () => applyWishImageUrl(els.wishImageLinkInput?.value));
  els.wishImageLinkInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyWishImageUrl(els.wishImageLinkInput.value);
    }
  });
  els.wishRemoveImage.addEventListener("click", removeWishImage);
  els.wishlistForm.addEventListener("submit", saveWish);
  els.wishCancelEdit.addEventListener("click", () => {
    resetWishForm();
    setWishlistExpanded(false);
    setWishlistStatus("");
  });
  els.wishTabs?.querySelectorAll("[data-wish-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeWishView = button.dataset.wishView === "done" ? "done" : "open";
      renderWishes();
    });
  });
  els.wishCompleteForm.addEventListener("submit", submitWishCompletion);
  els.wishCompleteClose.addEventListener("click", closeWishCompleteDialog);
  els.wishCompleteCancel.addEventListener("click", closeWishCompleteDialog);
  els.wishCompleteDialog.addEventListener("click", (event) => {
    if (event.target === els.wishCompleteDialog) closeWishCompleteDialog();
  });
  els.weekendToggle.addEventListener("click", () => {
    setWeekendExpanded(els.weekendForm.hidden);
  });
  els.weekendImageInput?.addEventListener("change", () => addWeekendFiles(els.weekendImageInput.files));
  els.weekendImageDrop?.addEventListener("paste", handleWeekendImagePaste);
  els.weekendImageLinkAdd?.addEventListener("click", () => addWeekendImageLinks());
  els.weekendImageLinkInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addWeekendImageLinks();
    }
  });
  els.weekendImagePreviews?.addEventListener("click", (event) => {
    const existingButton = event.target.closest("[data-remove-weekend-existing]");
    const selectedButton = event.target.closest("[data-remove-weekend-selected]");
    const linkButton = event.target.closest("[data-remove-weekend-link]");
    if (!existingButton && !selectedButton && !linkButton) return;
    event.preventDefault();
    event.stopPropagation();
    if (existingButton) removeWeekendImageEntry("existing", Number(existingButton.dataset.removeWeekendExisting));
    if (selectedButton) removeWeekendImageEntry("selected", Number(selectedButton.dataset.removeWeekendSelected));
    if (linkButton) removeWeekendImageEntry("link", Number(linkButton.dataset.removeWeekendLink));
    setWeekendStatus("已移除场景图片，保存计划后生效。");
  });
  els.weekendForm.addEventListener("submit", saveWeekendPlan);
  els.weekendCancelEdit.addEventListener("click", () => {
    resetWeekendForm();
    setWeekendExpanded(false);
    setWeekendStatus("");
  });
  els.weekendCompletionInput?.addEventListener("change", () => addWeekendCompletionFiles(els.weekendCompletionInput.files));
  els.weekendCompletionDrop?.addEventListener("paste", (event) => {
    const files = getImageFilesFromClipboard(event, "weekend-recap");
    if (files.length) {
      event.preventDefault();
      addWeekendCompletionFiles(files);
      return;
    }
    const url = getClipboardImageUrl(event.clipboardData);
    if (addWeekendCompletionLinks(url)) event.preventDefault();
  });
  els.weekendCompletionPreviews?.addEventListener("click", (event) => {
    const existing = event.target.closest("[data-remove-weekend-completion-existing]");
    const file = event.target.closest("[data-remove-weekend-completion-file]");
    const link = event.target.closest("[data-remove-weekend-completion-link]");
    if (!existing && !file && !link) return;
    event.preventDefault();
    event.stopPropagation();
    if (existing) removeWeekendCompletionEntry("existing", Number(existing.dataset.removeWeekendCompletionExisting));
    if (file) removeWeekendCompletionEntry("file", Number(file.dataset.removeWeekendCompletionFile));
    if (link) removeWeekendCompletionEntry("link", Number(link.dataset.removeWeekendCompletionLink));
  });
  els.weekendCompletionLinkAdd?.addEventListener("click", () => addWeekendCompletionLinks());
  els.weekendCompletionLinkInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addWeekendCompletionLinks();
  });
  els.weekendCompletionForm?.addEventListener("submit", saveWeekendCompletion);
  els.weekendCompletionClose?.addEventListener("click", closeWeekendCompletionDialog);
  els.weekendCompletionCancel?.addEventListener("click", closeWeekendCompletionDialog);
  els.weekendCompletionDialog?.addEventListener("click", (event) => {
    if (event.target === els.weekendCompletionDialog) closeWeekendCompletionDialog();
  });
  document.addEventListener("paste", (event) => {
    if (!els.weekendCompletionDialog?.open || event.defaultPrevented) return;
    const files = getImageFilesFromClipboard(event, "weekend-recap");
    if (files.length) {
      event.preventDefault();
      addWeekendCompletionFiles(files);
      return;
    }
    const url = getClipboardImageUrl(event.clipboardData);
    if (url && addWeekendCompletionLinks(url)) event.preventDefault();
  });
  els.thanksForm.addEventListener("submit", saveGratitudeNote);
  els.thanksCancelEdit.addEventListener("click", resetGratitudeForm);
  els.thanksForm.querySelectorAll('input[name="thanksColor"]').forEach((input) => {
    input.addEventListener("change", () => {
      setSelectedThanksColor(input.value);
      if (state.session) {
        saveThanksColorPreference(input.value, {
          userId: state.session.user.id,
          syncCloud: true,
        });
      }
    });
  });
  els.secretToggle?.addEventListener("click", () => {
    renderSecretLinkedPhotoOptions();
    setSecretExpanded(els.secretForm.hidden);
  });
  els.secretImageInput?.addEventListener("click", () => {
    els.secretImageInput.value = "";
  });
  els.secretImageInput?.addEventListener("input", updateSecretPreview);
  els.secretImageInput?.addEventListener("change", updateSecretPreview);
  els.secretImageDrop?.addEventListener("paste", handleSecretPaste);
  els.secretImageLinkAdd?.addEventListener("click", () => addSecretImageLinks());
  els.secretImageLinkInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSecretImageLinks();
    }
  });
  els.secretForm?.addEventListener("submit", saveSecretItem);
  els.avatarButton.addEventListener("click", () => {
    els.userPopover.hidden = !els.userPopover.hidden;
  });
  els.accountSettingsButton.addEventListener("click", () => {
    els.userPopover.hidden = true;
    openSettingsDialog("settingsGeneral");
  });
  els.closeSettingsDialog.addEventListener("click", closeSettingsDialog);
  els.settingsDialog.addEventListener("click", (event) => {
    if (event.target === els.settingsDialog) closeSettingsDialog();
  });
  els.settingsNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveSettingsSection(button.dataset.settingsSection);
    });
  });
  els.notificationButton.addEventListener("click", async () => {
    await openNotificationsPanel();
  });
  els.closeNotificationDialog.addEventListener("click", () => els.notificationDialog.close());
  els.notificationDialog.addEventListener("click", (event) => {
    if (event.target === els.notificationDialog) els.notificationDialog.close();
  });
  window.addEventListener("online", () => {
    updateNetworkStatus();
    showMiniToast("网络已恢复，正在同步", { kind: "success" });
    void processDiaryUploadQueue();
  });
  window.addEventListener("offline", updateNetworkStatus);
  updateNetworkStatus();
  (navigator.connection || navigator.mozConnection || navigator.webkitConnection)?.addEventListener?.("change", () => {
    if (shouldAutoCacheMedia()) scheduleOfflineMediaCache();
    if (state.activePage === "gallery") renderGallery();
  });
  els.renameHomeButton.addEventListener("click", () => {
    openSettingsChildDialog(els.renameHomeDialog, () => {
      els.homeNameInput.value = state.accountProfile.homeName || loadHomeName(state.session?.user?.id);
      els.homeNameStatus.textContent = "";
      els.homeNameInput.focus();
    });
  });
  els.closeRenameHome.addEventListener("click", () => els.renameHomeDialog.close());
  els.renameHomeDialog.addEventListener("click", (event) => {
    if (event.target === els.renameHomeDialog) els.renameHomeDialog.close();
  });
  els.renameHomeDialog.addEventListener("close", reopenSettingsAfterChildDialog);
  els.renameHomeForm.addEventListener("submit", saveHomeName);
  els.resetHomeName.addEventListener("click", restoreDefaultHomeName);
  els.renameProfileButton.addEventListener("click", () => {
    openSettingsChildDialog(els.renameProfileDialog, () => {
      els.profileNicknameInput.value = getSessionDisplayName();
      els.profileNicknameStatus.textContent = "";
      els.profileNicknameInput.focus();
      els.profileNicknameInput.select();
    });
  });
  els.closeRenameProfile.addEventListener("click", () => els.renameProfileDialog.close());
  els.renameProfileDialog.addEventListener("click", (event) => {
    if (event.target === els.renameProfileDialog) els.renameProfileDialog.close();
  });
  els.renameProfileDialog.addEventListener("close", reopenSettingsAfterChildDialog);
  els.renameProfileForm.addEventListener("submit", saveProfileNickname);
  els.changeAvatarButton.addEventListener("click", () => {
    openSettingsChildDialog(els.avatarDialog, () => {
      els.avatarForm.reset();
      els.avatarStatus.textContent = "";
      setAvatarPreview(state.accountProfile.avatarUrl);
    });
  });
  els.settingsFeedLayoutButton?.addEventListener("click", () => {
    setMobileFeedLayout(loadMobileFeedLayout() === "single" ? "double" : "single");
  });
  els.refreshCacheInfoButton?.addEventListener("click", () => {
    void refreshCacheInfo();
  });
  els.cacheLimitButton?.addEventListener("click", changeCacheLimit);
  els.closeCacheLimitDialog?.addEventListener("click", () => els.cacheLimitDialog.close());
  els.cancelCacheLimit?.addEventListener("click", () => els.cacheLimitDialog.close());
  els.cacheLimitDialog?.addEventListener("click", (event) => {
    if (event.target === els.cacheLimitDialog) els.cacheLimitDialog.close();
  });
  els.cacheLimitDialog?.addEventListener("close", reopenSettingsAfterChildDialog);
  els.cacheLimitForm?.addEventListener("submit", saveCacheLimitFromDialog);
  els.cacheLimitDialog?.querySelectorAll("[data-cache-limit-preset]").forEach((button) => {
    button.addEventListener("click", () => applyCacheLimitPreset(button.dataset.cacheLimitPreset));
  });
  els.clearAppCacheButton?.addEventListener("click", () => {
    void clearAppCache();
  });
  els.closeAvatarDialog.addEventListener("click", () => els.avatarDialog.close());
  els.avatarDialog.addEventListener("click", (event) => {
    if (event.target === els.avatarDialog) els.avatarDialog.close();
  });
  els.avatarDialog.addEventListener("close", () => {
    clearAvatarPreviewUrl();
    reopenSettingsAfterChildDialog();
  });
  els.avatarInput.addEventListener("change", updateAvatarPreview);
  els.avatarForm.addEventListener("submit", saveAvatar);
  els.familyAccountButton.addEventListener("click", () => {
    openSettingsChildDialog(els.familyDialog, () => {
      els.familyStatus.textContent = "";
      els.familyNameInput.value = state.accountProfile.homeName || "我们的家";
      renderFamilyDialog();
    });
  });
  els.closeFamilyDialog.addEventListener("click", () => els.familyDialog.close());
  els.familyDialog.addEventListener("click", (event) => {
    if (event.target === els.familyDialog) els.familyDialog.close();
  });
  els.familyDialog.addEventListener("close", reopenSettingsAfterChildDialog);
  els.createFamilyForm.addEventListener("submit", createFamily);
  els.familyInviteForm.addEventListener("submit", addFamilyMember);
  els.changePasswordButton.addEventListener("click", () => {
    openSettingsChildDialog(els.changePasswordDialog, () => {
      els.changePasswordForm.reset();
      els.changePasswordStatus.textContent = "";
      els.newPasswordInput.focus();
    });
  });
  els.closeChangePassword.addEventListener("click", () => els.changePasswordDialog.close());
  els.changePasswordDialog.addEventListener("click", (event) => {
    if (event.target === els.changePasswordDialog) els.changePasswordDialog.close();
  });
  els.changePasswordDialog.addEventListener("close", reopenSettingsAfterChildDialog);
  els.changePasswordForm.addEventListener("submit", changePassword);
  els.recoveryKeyButton.addEventListener("click", () => {
    openSettingsChildDialog(els.recoveryKeyDialog, () => {
      els.recoveryKeyForm.reset();
      els.recoveryKeyStatus.textContent = "";
      els.recoveryKeyInput.focus();
    });
  });
  els.closeRecoveryKey.addEventListener("click", () => els.recoveryKeyDialog.close());
  els.recoveryKeyDialog.addEventListener("click", (event) => {
    if (event.target === els.recoveryKeyDialog) els.recoveryKeyDialog.close();
  });
  els.recoveryKeyDialog.addEventListener("close", reopenSettingsAfterChildDialog);
  els.recoveryKeyForm.addEventListener("submit", saveRecoveryKey);
  els.changeSecretPinButton?.addEventListener("click", () => {
    openSettingsChildDialog(els.secretPinDialog, openSecretPinSettings);
  });
  els.bindEmailButton?.addEventListener("click", () => {
    openSettingsChildDialog(els.emailBindingDialog, resetEmailBindingDialog);
  });
  els.closeEmailBinding?.addEventListener("click", () => els.emailBindingDialog?.close());
  els.emailBindingDialog?.addEventListener("click", (event) => {
    if (event.target === els.emailBindingDialog) els.emailBindingDialog.close();
  });
  els.emailBindingDialog?.addEventListener("close", reopenSettingsAfterChildDialog);
  els.emailBindingRequestForm?.addEventListener("submit", requestEmailBinding);
  els.emailBindingConfirmForm?.addEventListener("submit", confirmEmailBinding);
  els.closeLevelDialog?.addEventListener("click", () => els.levelDialog.close());
  els.closeAchievementDialog?.addEventListener("click", () => els.achievementDialog.close());
  els.achievementDialog?.addEventListener("click", (event) => {
    if (event.target === els.achievementDialog) els.achievementDialog.close();
  });
  els.levelDialog?.addEventListener("click", (event) => {
    if (event.target === els.levelDialog) els.levelDialog.close();
  });
  els.levelCurrentTitle?.addEventListener("click", () => {
    openLevelGuidePage();
  });
  els.closeForgotPassword.addEventListener("click", () => els.forgotPasswordDialog.close());
  els.forgotPasswordDialog.addEventListener("click", (event) => {
    if (event.target === els.forgotPasswordDialog) els.forgotPasswordDialog.close();
  });
  els.emailResetRequestForm?.addEventListener("submit", requestEmailPasswordReset);
  els.emailResetConfirmForm?.addEventListener("submit", confirmEmailPasswordReset);
  els.forgotPasswordForm.addEventListener("submit", resetForgottenPassword);
  els.vipBadge.addEventListener("click", () => {
    openLevelDialog();
  });
  els.vipPopoverBadge.addEventListener("click", () => {
    renderVipCenter();
    els.vipDialog.showModal();
  });
  els.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loginWithPassword();
    }
  });
  els.logoutButton.addEventListener("click", logout);
  document.addEventListener("click", (event) => {
    if (!els.userMenu.hidden && !els.userMenu.contains(event.target)) {
      els.userPopover.hidden = true;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.dialog.open) {
      event.preventDefault();
      closePhotoDialog();
      return;
    }
    if (isSecretImageDialogOpen() && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      moveDialogImage(event.key === "ArrowLeft" ? -1 : 1, true);
      return;
    }
    if (isSecretImageDialogOpen() && event.key === "Tab") {
      const focusable = [...els.dialog.querySelectorAll(
        'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
      )].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  diaryComposerController.bind();
  els.closeDialog.addEventListener("click", closePhotoDialog);
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) {
      closePhotoDialog();
    }
  });
  els.dialog.addEventListener("close", () => {
    const restoreScroll = state.dialogRestoreScrollY;
    const restorePhotoId = state.dialogRestorePhotoId;
    const restorePhotoTop = state.dialogRestorePhotoTop;
    state.activeDialogPhoto = null;
    state.dialogRandomMode = false;
    state.activeSecretDialogItem = null;
    state.dialogSecretSourceItem = null;
    state.photoComments = [];
    cancelDialogSwipe();
    cancelDialogBackSwipe();
    window.clearTimeout(state.dialogWheelResetTimer);
    state.dialogWheelResetTimer = null;
    state.dialogWheelAccumulator = 0;
    state.dialogWheelLockedUntil = 0;
    resetSecretImageZoom();
    if (els.dialogMedia) {
      els.dialogMedia.scrollTop = 0;
      els.dialogMedia.scrollLeft = 0;
    }
    els.photoCommentsSection.hidden = false;
    document.body.classList.remove("mobile-dialog-open");
    if (els.dialogRandomButton) {
      els.dialogRandomButton.hidden = true;
    }
    if (els.dialogSecretLinkButton) {
      els.dialogSecretLinkButton.hidden = true;
    }
    if (els.dialogSecretReturnButton) {
      els.dialogSecretReturnButton.hidden = true;
    }
    els.photoCommentForm.reset();
    cancelCommentReply();
    els.photoCommentStatus.textContent = "";
    els.dialog.classList.remove("no-comments-dialog", "secret-image-dialog", "mobile-page-dialog", "secret-image-fullscreen", "diary-detail-dialog", "diary-image-fullscreen", "weekend-image-dialog", "wish-detail-dialog", "wish-detail-no-image");
    if (els.wishDialogFeedback) {
      els.wishDialogFeedback.hidden = true;
      els.wishDialogFeedback.classList.remove("empty");
      els.wishDialogFeedbackText.textContent = "";
      els.wishDialogCompletedAt.textContent = "";
    }
    if (state.photoDialogBackdrop) state.photoDialogBackdrop.hidden = true;
    document.body.classList.remove("photo-dialog-open");
    unlockDialogBackgroundScroll(restoreScroll);
    state.dialogRestorePhotoId = restorePhotoId;
    state.dialogRestorePhotoTop = restorePhotoTop;
    restoreDialogReturnTarget(restoreScroll);
    state.dialogRestoreScrollY = 0;
    state.dialogRestorePhotoId = "";
    state.dialogRestorePhotoTop = 0;
    state.dialogRestoreSecretImageUrl = "";
    state.dialogRestoreElementTop = 0;
    const returnFocus = state.secretViewerReturnFocus;
    state.secretViewerReturnFocus = null;
    state.secretViewerInfoOpen = false;
    state.dialogImageRequestId += 1;
    els.dialogImage.removeAttribute("src");
    els.dialogImage.hidden = false;
    els.dialogImage.classList.remove("is-loading", "is-load-error");
    if (els.dialogVideo) {
      stopDiaryMotionVideo(els.dialogVideo);
      els.dialogVideo.hidden = true;
    }
    setSecretViewerStatus("");
    window.clearTimeout(state.secretViewerResizeTimer);
    els.dialog.removeAttribute("aria-modal");
    els.dialogImage.style.removeProperty("width");
    els.dialogImage.style.removeProperty("height");
    requestAnimationFrame(() => {
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
  });
  els.photoCommentForm.addEventListener("submit", savePhotoComment);
  els.cancelCommentReply.addEventListener("click", cancelCommentReply);
  els.dialogRandomButton?.addEventListener("click", openRandomMemory);
  els.dialogSecretLinkButton?.addEventListener("click", openSecretLinkedDiary);
  els.dialogSecretReturnButton?.addEventListener("click", returnToSecretItem);
  els.dialogPrev.addEventListener("click", () => moveDialogImage(-1));
  els.dialogNext.addEventListener("click", () => moveDialogImage(1));
  els.dialogDots?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-dialog-dot]");
    if (!button || !state.dialogImages.length) return;
    const nextIndex = Number(button.dataset.dialogDot);
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= state.dialogImages.length) return;
    const previousIndex = state.dialogImageIndex;
    state.dialogImageIndex = nextIndex;
    renderDialogMedia(nextIndex === previousIndex ? 0 : nextIndex > previousIndex ? 1 : -1);
  });
  els.diaryViewerPrev?.addEventListener("click", () => moveDialogImage(-1));
  els.diaryViewerNext?.addEventListener("click", () => moveDialogImage(1));
  els.diaryViewerZoomOut?.addEventListener("click", () => adjustDiaryViewerZoom(-0.25));
  els.diaryViewerZoomIn?.addEventListener("click", () => adjustDiaryViewerZoom(0.25));
  els.diaryViewerFit?.addEventListener("click", resetSecretImageZoom);
  els.diaryViewerRotate?.addEventListener("click", () => {
    if (!els.dialog?.classList.contains("diary-image-fullscreen")) return;
    state.diaryImageRotation = (state.diaryImageRotation + 90) % 360;
    applySecretImageZoom();
  });
  els.diaryViewerDownload?.addEventListener("click", downloadCurrentDiaryImage);
  els.secretViewerPrev?.addEventListener("click", () => moveDialogImage(-1, true));
  els.secretViewerNext?.addEventListener("click", () => moveDialogImage(1, true));
  els.secretViewerZoomOut?.addEventListener("click", () => {
    const rect = els.dialogMedia.getBoundingClientRect();
    zoomImageViewerAt(state.secretImageZoom.scale - 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  els.secretViewerZoomIn?.addEventListener("click", () => {
    const rect = els.dialogMedia.getBoundingClientRect();
    zoomImageViewerAt(state.secretImageZoom.scale + 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  els.secretViewerFit?.addEventListener("click", resetSecretImageZoom);
  els.secretViewerInfo?.addEventListener("click", () => {
    if (!isSecretImageDialogOpen()) return;
    state.secretViewerInfoOpen = !state.secretViewerInfoOpen;
    els.dialog.classList.toggle("secret-viewer-info-open", state.secretViewerInfoOpen);
    refreshSecretViewerToolbar();
  });
  els.dialogMedia.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    if (event.target === els.dialogVideo) return;
    if (
      state.activeSecretDialogItem &&
      isSecretImageViewerOpen() &&
      event.target === els.dialogImage
    ) {
      if (Date.now() >= state.suppressDialogImageClickUntil && state.secretImageZoom.scale > 1.01) {
        event.preventDefault();
        event.stopPropagation();
        resetSecretImageZoom();
      }
      return;
    }
    if (
      isMobileViewport() &&
      isZoomableImageDialogOpen() &&
      event.target === els.dialogImage &&
      state.secretImageZoom.scale > 1.01
    ) {
      if (Date.now() < state.suppressDialogImageClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
      resetSecretImageZoom();
      return;
    }
    if (state.activeSecretDialogItem) {
      if (isSecretImageViewerOpen()) {
        if (event.target === els.dialogMedia && state.secretImageZoom.scale <= 1.01) closePhotoDialog();
      } else if (event.target === els.dialogImage) {
        toggleDialogImageFullscreen();
      }
      return;
    }
    if (state.activeDialogPhoto) {
      toggleDiaryImageFullscreen();
    }
  });
  els.dialogImage.addEventListener("click", (event) => {
    if (state.activeSecretDialogItem && isSecretImageViewerOpen()) {
      event.preventDefault();
      event.stopPropagation();
      if (state.secretImageZoom.scale > 1.01 && Date.now() >= state.suppressDialogImageClickUntil) {
        resetSecretImageZoom();
      }
      return;
    }
    if (state.activeSecretDialogItem && isMobileViewport()) {
      event.preventDefault();
      event.stopPropagation();
      if (state.secretImageZoom.scale > 1.01 && Date.now() >= state.suppressDialogImageClickUntil) {
        resetSecretImageZoom();
      }
      return;
    }
    if (state.activeSecretDialogItem && !isSecretImageViewerOpen()) {
      event.preventDefault();
      event.stopPropagation();
      state.suppressDialogImageClickUntil = 0;
      toggleDialogImageFullscreen();
      return;
    }
    if (!state.activeDialogPhoto || state.activeSecretDialogItem || isMobileViewport()) return;
    event.stopPropagation();
    toggleDiaryImageFullscreen();
  });
  els.dialogExpandImage?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.suppressDialogImageClickUntil = 0;
    if (state.activeSecretDialogItem) {
      toggleDialogImageFullscreen({ bypassSuppression: true });
      return;
    }
    if (state.activeDialogPhoto) toggleDiaryImageFullscreen({ bypassSuppression: true });
  });
  els.dialogImage.addEventListener("dblclick", (event) => {
    if (!isSecretImageViewerOpen()) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.secretImageZoom.scale > 1.01) resetSecretImageZoom();
    else zoomImageViewerAt(2, event.clientX, event.clientY);
  });
  els.dialogImage.addEventListener("load", () => {
    if (isFittableImageDialogOpen()) fitSecretViewerImage();
    els.dialogImage.classList.remove("is-loading", "is-load-error");
    setSecretViewerStatus("");
    resetSecretImageZoom();
  });
  els.dialogImage.addEventListener("error", () => {
    if (!isSecretImageViewerOpen()) return;
    els.dialogImage.classList.remove("is-loading");
    els.dialogImage.classList.add("is-load-error");
    setSecretViewerStatus("error", "图片加载失败，请稍后重试");
  });
  els.dialogMedia.addEventListener("touchstart", beginSecretImageTouch, { passive: false });
  els.dialogMedia.addEventListener("touchmove", moveSecretImageTouch, { passive: false });
  els.dialogMedia.addEventListener("touchend", endSecretImageTouch, { passive: false });
  els.dialogMedia.addEventListener("touchcancel", endSecretImageTouch, { passive: false });
  els.dialogMedia.addEventListener("wheel", handleSecretViewerWheel, { passive: false });
  els.dialog.addEventListener("pointerdown", beginDialogBackSwipe, true);
  els.dialog.addEventListener("pointerup", finishDialogBackSwipe, true);
  els.dialog.addEventListener("pointercancel", cancelDialogBackSwipe, true);
  els.dialog.addEventListener("lostpointercapture", cancelDialogBackSwipe, true);
  els.dialogMedia.addEventListener("pointerdown", beginDialogSwipe);
  els.dialogMedia.addEventListener("pointermove", moveDialogSwipe);
  els.dialogMedia.addEventListener("pointerup", finishDialogSwipe);
  els.dialogMedia.addEventListener("pointercancel", cancelDialogSwipe);
  els.dialogMedia.addEventListener("lostpointercapture", cancelDialogSwipe);
  window.addEventListener("resize", () => {
    if (!isZoomableImageDialogOpen()) return;
    window.clearTimeout(state.secretViewerResizeTimer);
    state.secretViewerResizeTimer = window.setTimeout(() => {
      fitSecretViewerImage();
      state.secretImageZoom = normalizeSecretImageZoom(state.secretImageZoom);
      applySecretImageZoom();
    }, 120);
  });
  els.editForm.addEventListener("submit", savePhotoEdit);
  els.editImageInput.addEventListener("change", replaceEditingImage);
  els.addEditImageButton?.addEventListener("click", startAppendEditingImages);
  els.editMediaManager?.addEventListener("paste", handleEditImagePaste);
  els.deleteEditingPhoto.addEventListener("click", deletePhotoFromEditor);
  els.closeEditDialog.addEventListener("click", () => {
    state.editingPhoto = null;
    resetEditImageState();
    els.editDialog.close();
  });
  els.closeVipDialog.addEventListener("click", () => els.vipDialog.close());
  els.chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      vlogMode.close();
      state.activeFilter = chip.dataset.filter;
      state.visiblePhotoCount = pageSize;
      updateFilterChips();
      renderGallery();
    });
  });
  els.diarySearchInput?.addEventListener("input", () => {
    state.diarySearchQuery = els.diarySearchInput.value;
    state.visiblePhotoCount = pageSize;
    updateDiarySearchUi();
    renderGallery();
  });
  els.secretSearchInput?.addEventListener("input", () => {
    state.secretSearchQuery = els.secretSearchInput.value;
    renderSecretGallery();
  });
  els.secretCreateFolderButton?.addEventListener("click", createSecretFolder);
  els.clearDiarySearch?.addEventListener("click", () => {
    state.diarySearchQuery = "";
    state.visiblePhotoCount = pageSize;
    updateDiarySearchUi();
    renderGallery();
    els.diarySearchInput?.focus();
  });
  const scheduleViewportLayout = createFrameScheduler(() => {
    syncMobileComposerPlacement();
    window.clearTimeout(updateReadMoreHints.resizeTimer);
    updateReadMoreHints.resizeTimer = window.setTimeout(() => updateReadMoreHints(els.gallery), 120);
    scheduleGalleryMasonryLayout();
    updateSecretToolbarTop();
    updateDiaryBackTopButton();
  });
  const scheduleScrollUiUpdate = createFrameScheduler(() => {
    updateSecretToolbarTop();
    updateDiaryBackTopButton();
  });
  window.addEventListener("resize", scheduleViewportLayout, { passive: true });
  window.addEventListener("scroll", scheduleScrollUiUpdate, { passive: true });
  
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "OPEN_PUSH_NOTIFICATION") {
      void openPushDestination(event.data.data || {});
    }
  });
  
  
}
