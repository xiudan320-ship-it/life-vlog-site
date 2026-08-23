function ensureWeekendAlbumDialog(documentTarget) {
  let dialog = documentTarget.querySelector("#weekendAlbumDialog");
  if (dialog) return dialog;

  dialog = documentTarget.createElement("dialog");
  dialog.id = "weekendAlbumDialog";
  dialog.className = "weekend-album-dialog";
  dialog.setAttribute("aria-labelledby", "weekendAlbumTitle");
  dialog.innerHTML = `
    <section class="weekend-album-window">
      <header class="weekend-album-header">
        <div>
          <p>Weekend Album</p>
          <h2 id="weekendAlbumTitle">周末相册</h2>
          <span id="weekendAlbumSummary"></span>
        </div>
        <button class="weekend-album-close" type="button" aria-label="关闭相册">×</button>
      </header>
      <div class="weekend-album-grid" aria-label="全部照片"></div>
    </section>`;
  dialog.querySelector(".weekend-album-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  documentTarget.body.append(dialog);
  return dialog;
}

function openWeekendAlbumDialog(plan, kind, openGallery, documentTarget) {
  const images = kind === "completion" ? plan?.completionImages : plan?.images;
  if (!images?.length) return;

  const dialog = ensureWeekendAlbumDialog(documentTarget);
  const title = kind === "completion" ? `${plan.title || "周末"} · 完成回顾` : plan.title || "周末相册";
  dialog.querySelector("#weekendAlbumTitle").textContent = title;
  dialog.querySelector("#weekendAlbumSummary").textContent = `共 ${images.length} 张 · 点击单张放大`;
  const grid = dialog.querySelector(".weekend-album-grid");
  grid.replaceChildren(
    ...images.map((image, index) => {
      const button = documentTarget.createElement("button");
      button.type = "button";
      button.dataset.weekendAlbumImage = String(index);
      button.setAttribute("aria-label", `放大第 ${index + 1} 张照片`);
      const preview = documentTarget.createElement("img");
      preview.src = image.thumbnail_url || image.image_url;
      preview.alt = `${title} ${index + 1}`;
      preview.loading = "lazy";
      preview.decoding = "async";
      button.append(preview);
      button.addEventListener("click", () => {
        dialog.close();
        openGallery(plan, index, kind);
      });
      return button;
    })
  );
  if (!dialog.open) dialog.showModal();
}

export function bindWeekendGalleryInteractions(
  root,
  { getPlan = () => null, openGallery = () => {} } = {}
) {
  if (!root) return;
  const documentTarget = root.ownerDocument || document;

  root.querySelectorAll("[data-weekend-gallery]").forEach((button) => {
    button.addEventListener("click", () => {
      const plan = getPlan(button.dataset.weekendGallery);
      const kind = button.dataset.weekendGalleryKind || "plan";
      openWeekendAlbumDialog(plan, kind, openGallery, documentTarget);
    });
  });
}
