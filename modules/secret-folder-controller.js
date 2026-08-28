import { confirmAction } from "./confirm-dialog.js";
import {
  buildSecretFolderListMarkup,
  buildSecretFolderOptions,
} from "./secret-gallery-view.js";
import { normalizeSecretImages } from "./secret-domain.js";
import { secretFolderFromCloudRow } from "./cloud-models.js";
import { escapeHtml } from "./ui-formatters.js";

export function createSecretFolderController({
  elements,
  state,
  repository,
  allFolderId,
  favoritesFolderId,
  getDefaultFolderId,
  setDefaultFolderId,
  saveItemsCache,
  setStatus,
  showToast,
  isMobileViewport,
  renderGallery,
  deleteAlbum,
  toggleAlbumPin,
  documentTarget = document,
  windowTarget = window,
}) {
  const els = elements;

  function closeSecretFolderContextMenu() {
    if (!state.secretFolderContextMenu) return;
    documentTarget.removeEventListener("pointerdown", state.secretFolderContextMenu.closeOnOutside, true);
    windowTarget.removeEventListener("resize", closeSecretFolderContextMenu);
    windowTarget.removeEventListener("scroll", closeSecretFolderContextMenu, true);
    state.secretFolderContextMenu.element.remove();
    state.secretFolderContextMenu = null;
  }

  function closeSecretAlbumContextMenu() {
    if (!state.secretAlbumContextMenu) return;
    documentTarget.removeEventListener("pointerdown", state.secretAlbumContextMenu.closeOnOutside, true);
    windowTarget.removeEventListener("resize", closeSecretAlbumContextMenu);
    windowTarget.removeEventListener("scroll", closeSecretAlbumContextMenu, true);
    state.secretAlbumContextMenu.element.remove();
    state.secretAlbumContextMenu = null;
  }

  function openSecretFolderContextMenu(folder, clientX, clientY) {
    if (!folder || folder.virtual || isMobileViewport()) return;
    closeSecretFolderContextMenu();
    closeSecretAlbumContextMenu();
    const currentDefaultId = getDefaultFolderId();
    const menu = documentTarget.createElement("div");
    menu.className = "secret-folder-context-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <span>${escapeHtml(folder.name)}</span>
      <button type="button" role="menuitem" data-secret-folder-default ${currentDefaultId === folder.id ? "disabled" : ""}>
        ${currentDefaultId === folder.id ? "当前默认入口" : "设为默认入口"}
      </button>
      <button class="danger" type="button" role="menuitem" data-secret-folder-delete>删除文件夹</button>
    `;
    documentTarget.body.append(menu);
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(10, Math.min(clientX, windowTarget.innerWidth - rect.width - 10))}px`;
    menu.style.top = `${Math.max(10, Math.min(clientY, windowTarget.innerHeight - rect.height - 10))}px`;
    const closeOnOutside = (event) => {
      if (!menu.contains(event.target)) closeSecretFolderContextMenu();
    };
    state.secretFolderContextMenu = { element: menu, closeOnOutside };
    documentTarget.addEventListener("pointerdown", closeOnOutside, true);
    windowTarget.addEventListener("resize", closeSecretFolderContextMenu);
    windowTarget.addEventListener("scroll", closeSecretFolderContextMenu, true);
    menu.querySelector("[data-secret-folder-default]")?.addEventListener("click", () => {
      void setDefaultFolderId(folder.id);
      closeSecretFolderContextMenu();
      showToast(`以后进入秘藏会先打开「${folder.name}」`, { kind: "success" });
    });
    menu.querySelector("[data-secret-folder-delete]")?.addEventListener("click", async () => {
      closeSecretFolderContextMenu();
      await deleteSecretFolder(folder);
    });
  }

  function openSecretAlbumContextMenu(item, clientX, clientY) {
    if (!item || isMobileViewport()) return;
    closeSecretFolderContextMenu();
    closeSecretAlbumContextMenu();
    const menu = documentTarget.createElement("div");
    menu.className = "secret-folder-context-menu secret-album-context-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <span>${escapeHtml(item.title || "未命名相册")}</span>
      <button type="button" role="menuitem" data-secret-album-pin>${item.isPinned ? "取消置顶" : "置顶相册"}</button>
      <button class="danger" type="button" role="menuitem">删除相册</button>
    `;
    documentTarget.body.append(menu);
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(10, Math.min(clientX, windowTarget.innerWidth - rect.width - 10))}px`;
    menu.style.top = `${Math.max(10, Math.min(clientY, windowTarget.innerHeight - rect.height - 10))}px`;
    const closeOnOutside = (event) => {
      if (!menu.contains(event.target)) closeSecretAlbumContextMenu();
    };
    state.secretAlbumContextMenu = { element: menu, closeOnOutside };
    documentTarget.addEventListener("pointerdown", closeOnOutside, true);
    windowTarget.addEventListener("resize", closeSecretAlbumContextMenu);
    windowTarget.addEventListener("scroll", closeSecretAlbumContextMenu, true);
    menu.querySelector("[data-secret-album-pin]")?.addEventListener("click", async () => {
      closeSecretAlbumContextMenu();
      await toggleAlbumPin?.(item);
    });
    menu.querySelector("button.danger")?.addEventListener("click", async () => {
      closeSecretAlbumContextMenu();
      await deleteAlbum(item);
    });
  }

  function renderSecretFolderControls() {
    if (!els.secretFolderList) return;
    const defaultFolderId = getDefaultFolderId();
    const favoriteCount = state.secretItems.reduce(
      (total, item) => total + normalizeSecretImages(item.images).filter((image) => image.favorite).length,
      0
    );
    const folderButtons = [
      { id: allFolderId, name: "全部相册", count: state.secretItems.length, virtual: true, isAll: true },
      { id: favoritesFolderId, name: "收藏夹", count: favoriteCount, virtual: true, isFavorites: true },
      ...state.secretFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        count: state.secretItems.filter((item) => item.folderId === folder.id).length,
      })),
    ];
    els.secretFolderList.hidden = Boolean(state.activeSecretAlbumId);
    els.secretFolderList.innerHTML = buildSecretFolderListMarkup({
      folders: folderButtons,
      activeFolderId: state.activeSecretFolderId,
      defaultFolderId,
    });
    els.secretFolderList.querySelectorAll("[data-secret-folder]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeSecretFolderId = button.dataset.secretFolder || allFolderId;
        renderGallery();
      });
      button.addEventListener("contextmenu", (event) => {
        const folder = folderButtons.find((entry) => entry.id === (button.dataset.secretFolder || allFolderId));
        if (folder?.virtual) return;
        event.preventDefault();
        openSecretFolderContextMenu(folder, event.clientX, event.clientY);
      });
    });
    if (els.secretFolderInput) {
      els.secretFolderInput.innerHTML = buildSecretFolderOptions(state.secretFolders);
    }
  }

  async function createSecretFolder() {
    if (!state.cloudDb || !state.session) {
      showToast("请先登录后再创建收藏夹", { kind: "error" });
      return;
    }
    const name = await requestSecretFolderName();
    if (!name) return;
    const button = els.secretCreateFolderButton;
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      user_id: state.session.user.id,
      name,
      sort_order: state.secretFolders.length * 1000,
      created_at: now,
      updated_at: now,
    };
    if (button) button.disabled = true;
    setStatus("正在创建收藏夹...");
    try {
      const { data, error } = await repository.insertFolder(record, { select: "*", single: true });
      if (error) throw error;
      const saved = data && typeof data === "object" ? data : record;
      state.secretFolders.push(secretFolderFromCloudRow(saved));
      state.activeSecretFolderId = saved.id || record.id;
      renderGallery();
      setStatus("");
      showToast(`已创建「${name}」`, { kind: "success" });
    } catch (error) {
      const message = error?.message || "Cloudflare 暂时没有完成创建";
      setStatus(`新建文件夹失败：${message}`);
      showToast("新建收藏夹失败，请稍后重试", { kind: "error" });
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function renameActiveSecretFolder() {
    const folder = state.secretFolders.find((entry) => entry.id === state.activeSecretFolderId);
    if (!folder || !state.cloudDb || !state.session) return;
    const name = await requestSecretFolderName({
      value: folder.name,
      title: "重命名收藏夹",
      confirmLabel: "保存名称",
    });
    if (!name || name === folder.name) return;
    const updatedAt = new Date().toISOString();
    const { error } = await repository.updateFolder(folder.id, { name, updated_at: updatedAt });
    if (error) {
      showToast(error.message || "重命名失败", { kind: "error" });
      return;
    }
    folder.name = name;
    folder.updatedAt = updatedAt;
    renderGallery();
    showToast("收藏夹名称已更新", { kind: "success" });
  }

  async function deleteSecretFolder(folder) {
    if (!folder || !state.cloudDb || !state.session) return;
    const wasActive = state.activeSecretFolderId === folder.id;
    const albums = state.secretItems.filter((item) => item.folderId === folder.id);
    const confirmed = await confirmAction({
      eyebrow: "整理收藏夹",
      title: `删除「${folder.name}」？`,
      message: albums.length
        ? `其中 ${albums.length} 个相册会移回全部相册，照片不会被删除。`
        : "这个空收藏夹会被删除，照片和相册不会受到影响。",
      confirmLabel: "删除收藏夹",
      cancelLabel: "保留",
      danger: true,
    });
    if (!confirmed) return;
    setStatus("正在整理收藏夹...");
    for (const album of albums) {
      const { error } = await repository.updateOwnedItem(album.id, {
        folder_id: null,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setStatus(error.message || "移动相册失败，收藏夹未删除。");
        showToast("收藏夹删除失败", { kind: "error" });
        return;
      }
      album.folderId = "";
    }
    const { error } = await repository.removeFolder(folder.id);
    if (error) {
      setStatus(error.message || "删除收藏夹失败。");
      showToast("收藏夹删除失败", { kind: "error" });
      return;
    }
    state.secretFolders = state.secretFolders.filter((entry) => entry.id !== folder.id);
    if (getDefaultFolderId() === folder.id) await setDefaultFolderId("");
    if (wasActive) state.activeSecretFolderId = allFolderId;
    saveItemsCache(state.session.user.id);
    renderGallery();
    setStatus("");
    showToast("文件夹已删除，相册已移回全部相册", { kind: "success" });
  }

  function deleteActiveSecretFolder() {
    const folder = state.secretFolders.find((entry) => entry.id === state.activeSecretFolderId);
    return deleteSecretFolder(folder);
  }

  function requestSecretFolderName({ value = "", title = "新建文件夹", confirmLabel = "创建" } = {}) {
    return new Promise((resolve) => {
      let dialog = documentTarget.querySelector("#secretFolderDialog");
      if (!dialog) {
        dialog = documentTarget.createElement("dialog");
        dialog.id = "secretFolderDialog";
        dialog.className = "secret-folder-dialog";
        documentTarget.body.append(dialog);
      }
      dialog.innerHTML = `<form novalidate>
        <button class="secret-folder-dialog-close" data-action="cancel" type="button" aria-label="关闭">×</button>
        <header><span>Collection</span><h2>${escapeHtml(title)}</h2><p>用收藏夹整理相册，不会改变里面的照片。</p></header>
        <label><span>收藏夹名称</span><input name="folderName" maxlength="40" autocomplete="off" value="${escapeHtml(value)}" placeholder="例如：旅行、灵感、一起生活" required /></label>
        <p class="secret-folder-dialog-error" role="alert" hidden></p>
        <div class="secret-folder-dialog-actions"><button data-action="cancel" type="button">取消</button><button class="primary" data-action="confirm" type="submit">${escapeHtml(confirmLabel)}</button></div>
      </form>`;
      const form = dialog.querySelector("form");
      const input = dialog.querySelector("input");
      const errorLabel = dialog.querySelector(".secret-folder-dialog-error");
      let settled = false;
      const cleanup = () => {
        form.removeEventListener("submit", submit);
        dialog.removeEventListener("cancel", cancel);
        dialog.removeEventListener("close", close);
        dialog.querySelectorAll('[data-action="cancel"]').forEach((button) => button.removeEventListener("click", cancel));
      };
      const finish = (result = "") => {
        if (settled) return;
        settled = true;
        cleanup();
        if (dialog.open) dialog.close();
        resolve(result);
      };
      const submit = (event) => {
        event.preventDefault();
        const folderName = String(input.value || "").trim().slice(0, 40);
        if (!folderName) {
          errorLabel.textContent = "请先写一个收藏夹名称";
          errorLabel.hidden = false;
          input.setAttribute("aria-invalid", "true");
          input.focus();
          return;
        }
        finish(folderName);
      };
      const cancel = (event) => {
        event?.preventDefault?.();
        finish("");
      };
      const close = () => finish("");
      input.addEventListener("input", () => {
        errorLabel.hidden = true;
        input.removeAttribute("aria-invalid");
      });
      form.addEventListener("submit", submit);
      dialog.addEventListener("cancel", cancel);
      dialog.addEventListener("close", close);
      dialog.querySelectorAll('[data-action="cancel"]').forEach((button) => button.addEventListener("click", cancel));
      dialog.showModal();
      windowTarget.setTimeout(() => input.focus({ preventScroll: true }), 0);
    });
  }

  return {
    closeSecretAlbumContextMenu,
    closeSecretFolderContextMenu,
    createSecretFolder,
    deleteActiveSecretFolder,
    deleteSecretFolder,
    openSecretAlbumContextMenu,
    openSecretFolderContextMenu,
    renameActiveSecretFolder,
    renderSecretFolderControls,
    requestSecretFolderName,
  };
}
