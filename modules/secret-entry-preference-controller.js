export function createSecretEntryPreferenceController({
  state,
  repository,
  allFolderId,
  favoritesFolderId,
  renderFolderControls,
  setGlobalStatus,
}) {
  function getDefaultFolderId() {
    return state.session ? state.secretDefaultFolderId || allFolderId : allFolderId;
  }

  async function setDefaultFolderId(folderId) {
    if (!state.session) return;
    const nextFolderId = folderId && ![allFolderId, favoritesFolderId].includes(folderId)
      ? folderId
      : "";
    state.secretDefaultFolderId = nextFolderId;
    renderFolderControls();
    try {
      const { error } = await repository.update(
        "user_profiles",
        { secret_default_folder_id: nextFolderId || null },
        { user_id: state.session.user.id }
      );
      if (error) throw error;
    } catch (error) {
      setGlobalStatus(`默认入口同步失败：${error.message || "请稍后重试"}`);
    }
  }

  return { getDefaultFolderId, setDefaultFolderId };
}
