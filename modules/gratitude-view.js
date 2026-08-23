import { escapeHtml, formatCommentTime } from "./ui-formatters.js";

export function normalizeGratitudeColor(color, allowedColors) {
  return allowedColors.has(color) ? color : "#2f6b3b";
}

export function renderGratitudeNotesView({
  boardElement,
  notes = [],
  signedIn = false,
  allowedColors,
  getAuthorName,
  canManageItem,
  onEdit,
  onDelete,
}) {
  if (!boardElement) return;
  if (!signedIn) {
    boardElement.innerHTML = `<div class="empty">登录后可以和家人留下一句话。</div>`;
    return;
  }
  if (!notes.length) {
    boardElement.innerHTML = `<div class="empty">留言板还是空的。先留下一句今天想感谢的话。</div>`;
    return;
  }

  boardElement.innerHTML = notes
    .map((note, index) => {
      const canManage = canManageItem(note);
      const safeColor = normalizeGratitudeColor(note.text_color, allowedColors);
      return `
        <article class="thanks-note" style="--note-color:${safeColor}">
          <span class="thanks-note-index">${String(index + 1).padStart(2, "0")}</span>
          <p>${escapeHtml(note.body)}</p>
          <footer>
            <span>${escapeHtml(getAuthorName(note.user_id))}</span>
            <time>${formatCommentTime(note.created_at)}</time>
            ${canManage ? `<span class="thanks-note-actions">
              <button type="button" data-edit-thanks="${escapeHtml(note.id)}">编辑</button>
              <button type="button" data-delete-thanks="${escapeHtml(note.id)}">删除</button>
            </span>` : ""}
          </footer>
        </article>
      `;
    })
    .join("");

  boardElement.querySelectorAll("[data-edit-thanks]").forEach((button) => {
    button.addEventListener("click", () => onEdit(button.dataset.editThanks));
  });
  boardElement.querySelectorAll("[data-delete-thanks]").forEach((button) => {
    button.addEventListener("click", () => onDelete(button.dataset.deleteThanks));
  });
}
