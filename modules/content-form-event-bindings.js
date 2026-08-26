import { getClipboardImageUrl } from "./media-metadata.js";

export function bindContentFormEvents({ elements, state, controllers }) {
  const els = elements;
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
    addSecretImageLinks,
    getImageFilesFromClipboard,
    handleSecretPaste,
    renderSecretLinkedPhotoOptions,
    saveSecretItem,
    setSecretExpanded,
    updateSecretPreview,
  } = controllers.secret;

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
}
