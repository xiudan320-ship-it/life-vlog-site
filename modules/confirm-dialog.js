function escapeDialogText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function confirmAction({
  eyebrow = "请确认",
  title = "确定继续？",
  message = "",
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "wish-delete-dialog action-confirm-dialog";
    dialog.dataset.kind = danger ? "danger" : "default";
    dialog.innerHTML = `
      <form method="dialog">
        <div class="wish-delete-symbol" aria-hidden="true">${danger ? "!" : "?"}</div>
        <div class="wish-delete-copy">
          <small>${escapeDialogText(eyebrow)}</small>
          <h2>${escapeDialogText(title)}</h2>
          ${message ? `<p>${escapeDialogText(message)}</p>` : ""}
        </div>
        <div class="wish-delete-actions">
          <button type="submit" value="cancel">${escapeDialogText(cancelLabel)}</button>
          <button class="${danger ? "danger" : "primary"}" type="submit" value="confirm">${escapeDialogText(confirmLabel)}</button>
        </div>
      </form>`;

    const finish = () => {
      const confirmed = dialog.returnValue === "confirm";
      dialog.remove();
      resolve(confirmed);
    };
    dialog.addEventListener("close", finish, { once: true });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      dialog.close("cancel");
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('button[value="cancel"]')?.focus();
  });
}
