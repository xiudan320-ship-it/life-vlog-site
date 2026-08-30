import { getClipboardImageUrl } from "./media-metadata.js";

const boundListeners = new WeakMap();
function listen(element, type, listener, options) {
  if (!element?.addEventListener) return;
  let listeners = boundListeners.get(element);
  if (!listeners) { listeners = new Set(); boundListeners.set(element, listeners); }
  const key = type + ":" + String(listener);
  if (listeners.has(key)) return;
  listeners.add(key);
  element.addEventListener(type, listener, options);
}

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

  listen(els.recipeToggle, "click", () => {
    setRecipeExpanded(els.recipeForm.hidden);
  });
  listen(els.recipeCoverInput, "change", updateRecipeCoverPreview);
  listen(els.recipeCoverDrop, "paste", handleRecipeCoverPaste);
  listen(els.recipeCoverLinkAdd, "click", () => applyRecipeCoverUrl(els.recipeCoverLinkInput?.value));
  listen(els.recipeCoverLinkInput, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyRecipeCoverUrl(els.recipeCoverLinkInput.value);
    }
  });
  listen(document, "paste", (event) => {
    if (event.defaultPrevented || state.activePage !== "recipes" || els.recipeForm.hidden) return;
    const hasImage = Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/"));
    if (!hasImage && event.target !== els.recipeCoverLinkInput && event.target !== els.recipeCoverDrop) return;
    handleRecipeCoverPaste(event);
  });
  listen(document, "paste", (event) => {
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
  listen(els.recipeForm, "submit", saveRecipe);
  listen(els.recipeCancelEdit, "click", () => {
    resetRecipeForm();
    setRecipeExpanded(false);
    setRecipeStatus("");
  });
  listen(els.wishlistToggle, "click", () => {
    setWishlistExpanded(els.wishlistForm.hidden);
  });
  listen(els.wishImageInput, "change", updateWishImagePreview);
  listen(els.wishImageDrop, "paste", handleWishImagePaste);
  listen(els.wishImageLinkAdd, "click", () => applyWishImageUrl(els.wishImageLinkInput?.value));
  listen(els.wishImageLinkInput, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyWishImageUrl(els.wishImageLinkInput.value);
    }
  });
  listen(els.wishRemoveImage, "click", removeWishImage);
  listen(els.wishlistForm, "submit", saveWish);
  listen(els.wishCancelEdit, "click", () => {
    resetWishForm();
    setWishlistExpanded(false);
    setWishlistStatus("");
  });
  els.wishTabs?.querySelectorAll("[data-wish-view]").forEach((button) => {
    listen(button, "click", () => {
      state.activeWishView = button.dataset.wishView === "done" ? "done" : "open";
      renderWishes();
    });
  });
  listen(els.wishCompleteForm, "submit", submitWishCompletion);
  listen(els.wishCompleteClose, "click", closeWishCompleteDialog);
  listen(els.wishCompleteDialog, "click", (event) => {
    if (event.target === els.wishCompleteDialog) closeWishCompleteDialog();
  });
  listen(els.weekendToggle, "click", () => {
    setWeekendExpanded(els.weekendForm.hidden);
  });
  listen(els.weekendImageInput, "change", () => addWeekendFiles(els.weekendImageInput.files));
  listen(els.weekendImageDrop, "paste", handleWeekendImagePaste);
  listen(els.weekendImageLinkAdd, "click", () => addWeekendImageLinks());
  listen(els.weekendImageLinkInput, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addWeekendImageLinks();
    }
  });
  listen(els.weekendImagePreviews, "click", (event) => {
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
  listen(els.weekendForm, "submit", saveWeekendPlan);
  listen(els.weekendCancelEdit, "click", () => {
    resetWeekendForm();
    setWeekendExpanded(false);
    setWeekendStatus("");
  });
  listen(els.weekendCompletionInput, "change", () => addWeekendCompletionFiles(els.weekendCompletionInput.files));
  listen(els.weekendCompletionDrop, "paste", (event) => {
    const files = getImageFilesFromClipboard(event, "weekend-recap");
    if (files.length) {
      event.preventDefault();
      addWeekendCompletionFiles(files);
      return;
    }
    const url = getClipboardImageUrl(event.clipboardData);
    if (addWeekendCompletionLinks(url)) event.preventDefault();
  });
  listen(els.weekendCompletionPreviews, "click", (event) => {
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
  listen(els.weekendCompletionLinkAdd, "click", () => addWeekendCompletionLinks());
  listen(els.weekendCompletionLinkInput, "keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addWeekendCompletionLinks();
  });
  listen(els.weekendCompletionForm, "submit", saveWeekendCompletion);
  listen(els.weekendCompletionClose, "click", closeWeekendCompletionDialog);
  listen(els.weekendCompletionCancel, "click", closeWeekendCompletionDialog);
  listen(els.weekendCompletionDialog, "click", (event) => {
    if (event.target === els.weekendCompletionDialog) closeWeekendCompletionDialog();
  });
  listen(document, "paste", (event) => {
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
  listen(els.thanksForm, "submit", saveGratitudeNote);
  listen(els.thanksCancelEdit, "click", resetGratitudeForm);
  els.thanksForm?.querySelectorAll('input[name="thanksColor"]').forEach((input) => {
    listen(input, "change", () => {
      setSelectedThanksColor(input.value);
      if (state.session) {
        saveThanksColorPreference(input.value, {
          userId: state.session.user.id,
          syncCloud: true,
        });
      }
    });
  });
  listen(els.secretToggle, "click", () => {
    renderSecretLinkedPhotoOptions();
    setSecretExpanded(els.secretForm.hidden);
  });
  listen(els.secretImageInput, "click", () => {
    els.secretImageInput.value = "";
  });
  listen(els.secretImageInput, "input", updateSecretPreview);
  listen(els.secretImageInput, "change", updateSecretPreview);
  listen(els.secretImageDrop, "paste", handleSecretPaste);
  listen(els.secretImageLinkAdd, "click", () => addSecretImageLinks());
  listen(els.secretImageLinkInput, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSecretImageLinks();
    }
  });
  listen(els.secretForm, "submit", saveSecretItem);
}
