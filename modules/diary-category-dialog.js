import { escapeHtml } from "./ui-formatters.js";
import { renderListIcon } from "./list-icons.js";

function getDialogResult(active) {
  return active?.result || null;
}

/**
 * Owns the one category picker used by diary management. It deliberately
 * keeps persistence outside the view: callers provide onSave and only close
 * the picker after that operation succeeds.
 */
export function createDiaryCategoryDialog({ documentRef = document } = {}) {
  let dialog = null;
  let active = null;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = documentRef.createElement("dialog");
    dialog.id = "adminCategoryDialog";
    dialog.className = "admin-category-dialog";
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
      if (event.target.closest("[data-category-cancel]")) close();
    });
    dialog.addEventListener("change", (event) => {
      if (event.target.matches("[data-category-option]")) syncControls();
    });
    dialog.addEventListener("submit", (event) => {
      event.preventDefault();
      void save();
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("close", finish);
    documentRef.body.append(dialog);
    return dialog;
  }

  function selectedValue() {
    return dialog?.querySelector("[data-category-option]:checked")?.value || "";
  }

  function syncControls() {
    if (!dialog || !active) return;
    const value = selectedValue();
    const saveButton = dialog.querySelector("[data-category-save]");
    if (saveButton) saveButton.disabled = !value || value === active.current;
  }

  function restoreTrigger(trigger) {
    if (!trigger?.isConnected || typeof trigger.focus !== "function") return;
    try {
      trigger.focus({ preventScroll: true });
    } catch {
      trigger.focus();
    }
  }

  function finish() {
    if (!active) return;
    const pending = active;
    active = null;
    pending.resolve(getDialogResult(pending));
    restoreTrigger(pending.trigger);
  }

  function close() {
    if (!dialog) return;
    if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
      return;
    }
    dialog.hidden = true;
    finish();
  }

  async function save() {
    if (!active || active.saving) return;
    const value = selectedValue();
    if (!value || value === active.current) return;
    active.saving = true;
    const saveButton = dialog.querySelector("[data-category-save]");
    const cancelButton = dialog.querySelector("[data-category-cancel]");
    const status = dialog.querySelector("[data-category-status]");
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "保存中…";
      saveButton.setAttribute("aria-busy", "true");
    }
    if (cancelButton) cancelButton.disabled = true;
    if (status) {
      status.setAttribute("role", "status");
      status.textContent = "正在保存分类…";
    }
    try {
      const result = await active.onSave(value);
      active.result = result || value;
      close();
    } catch (error) {
      active.saving = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "保存分类";
        saveButton.removeAttribute("aria-busy");
      }
      if (cancelButton) cancelButton.disabled = false;
      if (status) {
        status.setAttribute("role", "alert");
        status.textContent = error?.message || "分类保存失败，请重试。";
      }
    }
  }

  function open({ photo, categories = [], current = photo?.category || "日常", getDisplayTitle, getAuthorName, onSave, trigger = null }) {
    const target = ensureDialog();
    if (active) close();
    const normalized = [...new Set([current, ...categories].map((value) => String(value || "").trim()).filter(Boolean))];
    active = {
      current: String(current || "日常"),
      onSave,
      resolve: null,
      result: null,
      saving: false,
      trigger,
    };
    target.innerHTML = `
      <form class="admin-category-form" method="dialog" aria-labelledby="adminCategoryTitle" aria-describedby="adminCategoryStatus">
        <header class="admin-category-context">
          <p class="kicker">Diary Category</p>
          <h2 id="adminCategoryTitle">修改日记分类</h2>
          <p><strong>${escapeHtml(getDisplayTitle?.(photo) || photo?.title || "无标题日记")}</strong><br />作者：${escapeHtml(getAuthorName?.(photo?.user_id) || "家庭成员")} · 当前分类：${escapeHtml(current || "日常")}</p>
        </header>
        <fieldset class="admin-category-options">
          <legend>选择新分类</legend>
          ${normalized.map((value) => `
            <label class="admin-category-option">
              <input type="radio" name="diary-category" value="${escapeHtml(value)}" data-category-option ${value === current ? "checked" : ""} />
              <span>${renderListIcon(value === current ? "check" : "sparkle", "ui-icon-inline")}<span>${escapeHtml(value)}</span></span>
            </label>`).join("")}
        </fieldset>
        <p class="status-line" id="adminCategoryStatus" data-category-status role="status" aria-live="polite"></p>
        <footer class="admin-category-actions">
          <button type="button" data-category-cancel>取消</button>
          <button class="primary" type="submit" data-category-save disabled>保存分类</button>
        </footer>
      </form>`;
    syncControls();
    return new Promise((resolve) => {
      active.resolve = resolve;
      target.hidden = false;
      try {
        if (typeof target.showModal === "function") target.showModal();
        else target.setAttribute("open", "");
      } catch {
        target.setAttribute("open", "");
      }
    });
  }

  return { open, close };
}
