export function bindSettingsEvents({ elements, state, controllers, core }) {
  const els = elements;
  const {
    updateNetworkStatus,
    showMiniToast,
    loadHomeName,
    getSessionDisplayName,
    performanceDiagnostics: performanceDiagnosticsFromCore,
  } = core;
  const {
    saveHomeName,
    restoreDefaultHomeName,
    saveProfileNickname,
    setAvatarPreview,
    clearAvatarPreviewUrl,
    updateAvatarPreview,
    saveAvatar,
  } = controllers.profilePreferences;
  const { openSettings: openSecretPinSettings } = controllers.secretPin;
  const {
    openChildDialog: openSettingsChildDialog,
    reopenAfterChildDialog: reopenSettingsAfterChildDialog,
  } = controllers.settingsShell;
  const {
    renderFamilyDialog,
    createFamily,
    addFamilyMember,
  } = controllers.familySettings;
  const {
    changePassword,
    confirmEmailBinding,
    confirmEmailPasswordReset,
    login: loginWithPassword,
    logout,
    requestEmailBinding,
    requestEmailPasswordReset,
    resetEmailBindingDialog,
    resetForgottenPassword,
    saveRecoveryKey,
  } = controllers.auth;
  const {
    schedule: scheduleOfflineMediaCache,
    shouldAutoCache: shouldAutoCacheMedia,
  } = controllers.offlineCache;
  const { loadMobileFeedLayout, setMobileFeedLayout } = controllers.layoutSettings;
  const textScale = controllers.textScale;
  const performanceDiagnostics = performanceDiagnosticsFromCore || controllers.performanceDiagnostics;
  const {
    openLevelGuidePage,
    renderVipCenter,
  } = controllers.gamification;
  const { processQueue: processDiaryUploadQueue } = controllers.diaryComposer;
  const { renderGallery } = controllers.diaryFeed;

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
  els.settingsAppearance?.querySelectorAll("[data-text-scale]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = textScale.set(button.dataset.textScale);
      els.settingsAppearance.querySelectorAll("[data-text-scale]").forEach((item) => item.setAttribute("aria-pressed", String(item.dataset.textScale === value)));
    });
  });
  const activeTextScale = textScale.load();
  els.settingsAppearance?.querySelectorAll("[data-text-scale]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.textScale === activeTextScale));
  });
  els.settingsTogglePerformance?.addEventListener("click", () => performanceDiagnostics.render());
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
  els.closeAchievementDialog?.addEventListener("click", () => els.achievementDialog.close());
  els.achievementDialog?.addEventListener("click", (event) => {
    if (event.target === els.achievementDialog) els.achievementDialog.close();
  });
  els.levelCurrentTitle?.addEventListener("click", openLevelGuidePage);
  els.closeForgotPassword.addEventListener("click", () => els.forgotPasswordDialog.close());
  els.forgotPasswordDialog.addEventListener("click", (event) => {
    if (event.target === els.forgotPasswordDialog) els.forgotPasswordDialog.close();
  });
  els.emailResetRequestForm?.addEventListener("submit", requestEmailPasswordReset);
  els.emailResetConfirmForm?.addEventListener("submit", confirmEmailPasswordReset);
  els.forgotPasswordForm.addEventListener("submit", resetForgottenPassword);
  els.vipPopoverBadge.addEventListener("click", () => {
    renderVipCenter();
    els.vipDialog.showModal();
  });
  els.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loginWithPassword();
  });
  els.logoutButton.addEventListener("click", logout);
  document.addEventListener("click", (event) => {
    if (!els.userMenu.hidden && !els.userMenu.contains(event.target)) {
      els.userPopover.hidden = true;
    }
  });
}
