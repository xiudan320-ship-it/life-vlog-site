import { confirmAction } from "./confirm-dialog.js";
import {
  getStoredPhotoMediaPaths,
  parseWeekendStoredNote,
  parseWishStoredNote,
} from "./media-metadata.js";

export function createTrashController({
  state,
  householdRepository,
  diaryRepository,
  photoFavorites,
  getPhotoImages,
  normalizeSecretImages,
  cleanupStoredImagePaths,
  showMiniToast,
  setGlobalStatus,
  getPhotoLabel,
  renderGallery,
  loadPhotos,
  loadSecretItems,
  loadGratitudeNotes,
  synchronizeWeekendPlans,
  synchronizeAnniversaries,
  synchronizeAccountData,
  renderTrashItems,
}) {

  async function createTrashItem(itemType, itemId, label, payload) {
    if (!state.cloudDb || !state.session || !itemId) return false;
    const deletedAt = new Date();
    const expiresAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trashId = crypto.randomUUID();
    const { error } = await householdRepository.insert("trash_items", {
      id: trashId,
      user_id: state.session.user.id,
      item_type: itemType,
      item_id: itemId,
      label: String(label || "").slice(0, 120),
      payload,
      deleted_at: deletedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
    if (error) {
      console.warn("Trash write failed:", error);
      return false;
    }
    return trashId;
  }
  
  async function snapshotPhotoCommentsForTrash(photoId) {
    if (!photoId) return [];
    const { data, error } = await diaryRepository.listComments(photoId);
    if (error) {
      throw new Error(`删除前读取留言失败，已取消删除：${error.message}`);
    }
    return (data || []).map((comment) => ({
      id: comment.id,
      photo_id: photoId,
      user_id: comment.user_id,
      parent_id: comment.parent_id || null,
      body: String(comment.body || ""),
      created_at: comment.created_at,
      updated_at: comment.updated_at || comment.created_at,
    }));
  }
  
  async function rollbackTrashItem(trashId) {
    if (!trashId || !state.cloudDb || !state.session) return;
    await householdRepository.remove("trash_items", { id: trashId }, { owned: true });
  }
  
  function confirmWishDeletion(wish) {
    return confirmAction({
      eyebrow: "移到回收站",
      title: "删除这个心愿？",
      message: `“${wish.title}”会保留 30 天，期间可以从设置里的回收站恢复。`,
      confirmLabel: "删除心愿",
      cancelLabel: "先保留",
      danger: true,
    });
  }
  
  function getTrashImagePaths(item) {
    const payload = item?.payload || {};
    if (item?.item_type === "photo") {
      return getPhotoImages(payload).flatMap(getStoredPhotoMediaPaths);
    }
    if (item?.item_type === "secret") {
      return [
        payload.cover_path,
        ...normalizeSecretImages(payload.images).flatMap((image) => [image.image_path, image.thumbnail_path]),
      ].filter(Boolean);
    }
    if (item?.item_type === "wish") {
      const media = parseWishStoredNote(payload.note);
      return [media.imagePath].filter(Boolean);
    }
    if (item?.item_type === "weekend") {
      const media = parseWeekendStoredNote(payload.note);
      return media.images
        .flatMap((image) => [image.image_path, image.thumbnail_path])
        .filter(Boolean);
    }
    return [];
  }
  
  async function loadTrashItems() {
    if (!state.cloudDb || !state.session) return [];
    const { data, error } = await householdRepository.rpc("list_trash_items", { p_limit: 500 });
    if (error) throw error;
    return data || [];
  }
  
  async function restoreTrashItem(item) {
    if (!item || !state.cloudDb || !state.session) return;
    const { error: restoreError } = await householdRepository.rpc("restore_trash_item", {
      p_trash_id: item.id,
    });
    if (restoreError) {
      showMiniToast(`恢复失败：${restoreError.message}`, { kind: "error", duration: 3200 });
      return;
    }
    showMiniToast("已恢复", { kind: "success" });
    await Promise.all([
      loadPhotos(),
      loadSecretItems(),
      loadGratitudeNotes(),
      synchronizeWeekendPlans(),
      synchronizeAnniversaries(),
      synchronizeAccountData(),
    ]);
    await renderTrashItems();
  }
  
  async function permanentlyDeleteTrashItem(item) {
    if (!item) return;
    const confirmed = await confirmAction({
      eyebrow: "永久删除",
      title: "彻底删除这条记录？",
      message: "关联图片也会一并清理，之后无法恢复。",
      confirmLabel: "永久删除",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed) return;
    const { error } = await householdRepository.rpc("permanently_delete_trash_item", {
      p_trash_id: item.id,
    });
    if (error) {
      showMiniToast(`永久删除失败：${error.message}`, { kind: "error" });
      return;
    }
    const paths = [...new Set(getTrashImagePaths(item))];
    if (paths.length) cleanupStoredImagePaths(paths).catch(() => {});
    showMiniToast("已永久删除", { kind: "success" });
    await renderTrashItems();
  }
  
  function getTrashOwnershipLabel(item) {
    const ownerName = String(item?.owner_username || "").trim();
    const deletedByName = String(item?.deleted_by_username || "").trim();
    if (ownerName && deletedByName && ownerName !== deletedByName) {
      return `原发布者：${ownerName} · 删除者：${deletedByName}`;
    }
    return `发布者：${ownerName || deletedByName || "家庭成员"}`;
  }
  
  async function deletePhoto(photo, triggerButton = null) {
    if (!state.cloudDb || !state.session || !photo) {
      setGlobalStatus("请先登录后再删除日记。");
      return false;
    }
  
    if (photo.user_id && photo.user_id !== state.session.user.id) {
      setGlobalStatus("只能删除自己发布的日记。");
      return false;
    }
  
    const ok = await confirmAction({
      eyebrow: "移到回收站",
      title: "删除这篇日记？",
      message: `“${getPhotoLabel(photo)}”会保留 30 天，期间可以恢复。`,
      confirmLabel: "删除日记",
      cancelLabel: "先保留",
      danger: true,
    });
    if (!ok) return false;
  
    setGlobalStatus("正在删除日记...");
    const originalButtonText = triggerButton?.textContent || "删除";
    if (triggerButton) {
      triggerButton.disabled = true;
      triggerButton.textContent = "删除中";
    }
  
    try {
      const comments = await snapshotPhotoCommentsForTrash(photo.id);
      const trashPayload = { ...photo, comments };
      const trashSaved = await createTrashItem("photo", photo.id, getPhotoLabel(photo), trashPayload);
      if (!trashSaved) throw new Error("无法写入回收站，已取消删除。");
      const { data: deletedRows, error: deleteError } = await diaryRepository.remove(photo.id, {
        select: "id",
      });
  
      if (deleteError) {
        await rollbackTrashItem(trashSaved);
        throw new Error(`数据库删除失败：${deleteError.message}`);
      }
      if (!deletedRows?.length) {
        await rollbackTrashItem(trashSaved);
        throw new Error("数据库没有删除任何记录，请确认 Cloudflare D1 权限和表结构已部署。");
      }
  
      state.photos = state.photos.filter((item) => item.id !== photo.id);
      photoFavorites.remove(photo.id);
      renderGallery();
      setGlobalStatus("日记已移到回收站，可在设置中恢复。");
      showMiniToast("已移到回收站", { kind: "success" });
  
      await loadPhotos();
      return true;
    } catch (error) {
      setGlobalStatus(error.message || "删除失败，请稍后重试。");
      if (triggerButton?.isConnected) {
        triggerButton.disabled = false;
        triggerButton.textContent = originalButtonText;
      }
      return false;
    }
  }
  
  
  return {
    createTrashItem,
    snapshotPhotoCommentsForTrash,
    rollbackTrashItem,
    confirmWishDeletion,
    getTrashImagePaths,
    loadTrashItems,
    restoreTrashItem,
    permanentlyDeleteTrashItem,
    getTrashOwnershipLabel,
    deletePhoto,
  };
}
