import { createVlogMode } from "./vlog-mode.js";

/**
 * Keep the VLOG filter interaction independent from the runtime assembler.
 */
export function createRuntimeVlogMode({
  canOpen,
  getActiveFilter,
  setActiveFilter,
  switchPage,
  pageSize,
  setVisiblePhotoCount,
  updateFilterChips,
  renderGallery,
  setUploadExpanded,
}) {
  return createVlogMode({
    canOpen,
    onOpen: async () => {
      setActiveFilter("VLOG");
      const opened = await switchPage("gallery");
      if (!opened || getActiveFilter() !== "VLOG") return;
      setVisiblePhotoCount(pageSize);
      updateFilterChips();
      renderGallery();
      setUploadExpanded(false);
    },
    onClose: () => {
      if (getActiveFilter() !== "VLOG") return;
      setActiveFilter("全部");
      updateFilterChips();
    },
  });
}
