const VIDEO_ACCEPT = "video/*,.mov,.mp4,.m4v,.webm";

export function createVlogMode({
  root = document,
  canOpen = () => true,
  onOpen = () => {},
  onClose = () => {},
  onNavigationStateChange = () => {},
} = {}) {
  let active = false;
  let original = null;

  function capture() {
    if (original) return;
    const composer = root.querySelector("#composer");
    const photoInput = root.querySelector("#photoInput");
    const motionInput = root.querySelector("#photoMotionInput");
    original = {
      kicker: composer?.querySelector(".section-title .kicker")?.textContent || "Upload",
      title: composer?.querySelector(".section-title h2")?.textContent || "发布新日记",
      photoLabel: root.querySelector("label[for='photoInput']")?.textContent || "选择图片或 Live Photo",
      motionLabel: root.querySelector("label[for='photoMotionInput']")?.textContent || "添加视频",
      fileName: root.querySelector("#fileName")?.textContent || "",
      photoAccept: photoInput?.accept || "",
      motionAccept: motionInput?.accept || "",
    };
  }

  function setText(selector, value) {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  }

  function open() {
    if (!canOpen()) return false;
    capture();
    active = true;
    root.body.classList.add("vlog-mode");
    root.querySelector("#composer")?.setAttribute("data-vlog-mode", "true");
    setText("#composer .section-title .kicker", "Vlog");
    setText("#composer .section-title h2", "发布新 VLOG");
    setText("label[for='photoInput']", "选择视频");
    setText("label[for='photoMotionInput']", "继续添加视频");
    setText("#fileName", "展开后选择视频文件");
    const photoInput = root.querySelector("#photoInput");
    const motionInput = root.querySelector("#photoMotionInput");
    if (photoInput) photoInput.accept = VIDEO_ACCEPT;
    if (motionInput) motionInput.accept = VIDEO_ACCEPT;
    const linkAdder = root.querySelector(".image-link-adder");
    if (linkAdder) linkAdder.hidden = true;
    void Promise.resolve(onOpen()).catch(() => {});
    onNavigationStateChange();
    return true;
  }

  function close() {
    if (!active && !original) return;
    const wasActive = active;
    active = false;
    root.body.classList.remove("vlog-mode");
    root.querySelector("#composer")?.removeAttribute("data-vlog-mode");
    if (original) {
      setText("#composer .section-title .kicker", original.kicker);
      setText("#composer .section-title h2", original.title);
      setText("label[for='photoInput']", original.photoLabel);
      setText("label[for='photoMotionInput']", original.motionLabel);
      setText("#fileName", original.fileName);
      const photoInput = root.querySelector("#photoInput");
      const motionInput = root.querySelector("#photoMotionInput");
      if (photoInput) photoInput.accept = original.photoAccept;
      if (motionInput) motionInput.accept = original.motionAccept;
    }
    const linkAdder = root.querySelector(".image-link-adder");
    if (linkAdder) linkAdder.hidden = false;
    if (wasActive) {
      onClose();
      onNavigationStateChange();
    }
  }

  return { open, close, isActive: () => active };
}

export function validateVlogUpload(files, links = []) {
  if (links.length) return "VLOG 只能上传视频，不能添加图片链接。";
  if (!files.length) return "请选择视频。";
  if (files.some((file) => {
    const type = String(file?.type || "").toLowerCase();
    return !type.startsWith("video/") && !/\.(mov|mp4|m4v|webm)$/i.test(file?.name || "");
  })) return "VLOG 只能上传视频文件。";
  return "";
}
