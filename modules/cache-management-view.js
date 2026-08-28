export function configureCacheManagementUi({
  elements,
  minMb,
  maxMb,
  setActiveSection,
  loadPolicy,
  savePolicy,
  showToast,
  downloadPool,
  clearPool,
  documentRef = document,
}) {
  const {
    cacheLimitDialog,
    cacheLimitInput,
    cacheLimitButton,
    settingsDialog,
    refreshCacheInfoButton,
    clearAppCacheButton,
    cacheLimitForm,
  } = elements;
  if (!cacheLimitDialog || !cacheLimitInput || !cacheLimitButton) return;
  const settingsNav = settingsDialog?.querySelector(".settings-sidebar nav");
  let cacheNav = settingsNav?.querySelector('[data-settings-section="settingsCache"]');
  if (settingsNav && !cacheNav) {
    cacheNav = documentRef.createElement("button");
    cacheNav.type = "button";
    cacheNav.dataset.settingsSection = "settingsCache";
    cacheNav.setAttribute("role", "tab");
    cacheNav.setAttribute("aria-selected", "false");
    cacheNav.textContent = "缓存";
    cacheNav.addEventListener("click", () => setActiveSection("settingsCache"));
    settingsNav.insertBefore(cacheNav, settingsNav.querySelector('[data-settings-section="settingsAccount"]'));
  }
  let cacheGroup = documentRef.querySelector("#settingsCache");
  if (!cacheGroup) {
    cacheGroup = documentRef.createElement("section");
    cacheGroup.className = "settings-group";
    cacheGroup.id = "settingsCache";
    cacheGroup.hidden = true;
    cacheGroup.innerHTML = '<p class="kicker">Offline</p><h3>缓存与离线</h3>';
    documentRef.querySelector("#settingsTools")?.before(cacheGroup);
  }
  [refreshCacheInfoButton, cacheLimitButton, documentRef.querySelector("#clearDiaryCacheButton"), documentRef.querySelector("#clearSecretCacheButton"), clearAppCacheButton]
    .filter(Boolean)
    .forEach((button) => cacheGroup.append(button));
  cacheLimitButton.querySelector("span").textContent = "缓存容量上限";
  const summary = cacheLimitButton.querySelector("small");
  if (summary) summary.textContent = "日记和秘藏分别按容量自动淘汰旧图片";

  let policyButton = documentRef.querySelector("#mediaCachePolicyButton");
  if (!policyButton) {
    policyButton = documentRef.createElement("button");
    policyButton.id = "mediaCachePolicyButton";
    policyButton.type = "button";
    policyButton.addEventListener("click", () => {
      const next = loadPolicy() === "wifi" ? "off" : "wifi";
      savePolicy(next);
      showToast(next === "wifi" ? "仅在明确识别为 Wi-Fi 时自动缓存" : "已关闭自动缓存", { kind: "success" });
    });
    cacheGroup.insertBefore(policyButton, cacheLimitButton);
  }

  if (!documentRef.querySelector("#downloadDiaryOfflineButton")) {
    const diaryDownload = documentRef.createElement("button");
    diaryDownload.id = "downloadDiaryOfflineButton";
    diaryDownload.type = "button";
    diaryDownload.innerHTML = "<span>下载日记离线包</span><strong>手动缓存当前日记文字和图片</strong>";
    diaryDownload.addEventListener("click", () => downloadPool("diary"));
    cacheGroup.insertBefore(diaryDownload, clearAppCacheButton);

    const secretDownload = documentRef.createElement("button");
    secretDownload.id = "downloadSecretOfflineButton";
    secretDownload.type = "button";
    secretDownload.innerHTML = "<span>下载全部秘藏离线包</span><strong>缓存全部秘藏相册和图片，直到达到容量上限</strong>";
    secretDownload.addEventListener("click", () => downloadPool("secret"));
    cacheGroup.insertBefore(secretDownload, clearAppCacheButton);
  }

  const heading = cacheLimitForm?.querySelector("h2");
  const intro = heading?.nextElementSibling;
  if (heading) heading.textContent = "本地缓存容量";
  if (intro) intro.textContent = "分别设置日记和秘藏图片在本机可占用的空间。达到上限后自动淘汰较旧图片，不影响云端原图。";
  const diaryLabel = cacheLimitInput.closest("label");
  if (diaryLabel?.querySelector("span")) diaryLabel.querySelector("span").textContent = "日记图片（MB）";
  cacheLimitInput.min = String(minMb);
  cacheLimitInput.max = String(maxMb);
  cacheLimitInput.step = "10";

  if (!documentRef.querySelector("#secretCacheLimitInput") && diaryLabel) {
    const label = documentRef.createElement("label");
    label.className = "cache-limit-field";
    label.innerHTML = `<span>秘藏图片（MB）</span><input id="secretCacheLimitInput" type="number" min="${minMb}" max="${maxMb}" step="10" inputmode="numeric" required />`;
    diaryLabel.after(label);
  }
  const presets = cacheLimitForm?.querySelectorAll("[data-cache-limit-preset]") || [];
  const presetValues = [50, 100, 200, 500];
  presets.forEach((button, index) => {
    const value = presetValues[index] || 100;
    button.dataset.cacheLimitPreset = String(value);
    button.textContent = `${value} / ${value * 3} MB`;
  });
  const hint = cacheLimitForm?.querySelector(".cache-limit-hint");
  if (hint) hint.textContent = "前一个数字是日记容量，后一个是秘藏容量。Wi-Fi 下自动保留最新 20 条日记；手动离线包会缓存到容量上限。";

  const group = cacheLimitButton.parentElement;
  if (group && !documentRef.querySelector("#clearDiaryCacheButton")) {
    const diaryClear = documentRef.createElement("button");
    diaryClear.id = "clearDiaryCacheButton";
    diaryClear.type = "button";
    diaryClear.innerHTML = "<span>清除日记缓存</span><strong>只清除日记文字与图片</strong>";
    diaryClear.addEventListener("click", () => clearPool("diary"));
    group.insertBefore(diaryClear, clearAppCacheButton);

    const secretClear = documentRef.createElement("button");
    secretClear.id = "clearSecretCacheButton";
    secretClear.type = "button";
    secretClear.innerHTML = "<span>清除秘藏缓存</span><strong>只清除秘藏相册与图片</strong>";
    secretClear.addEventListener("click", () => clearPool("secret"));
    group.insertBefore(secretClear, clearAppCacheButton);
  }
  [documentRef.querySelector("#clearDiaryCacheButton"), documentRef.querySelector("#clearSecretCacheButton")]
    .filter(Boolean)
    .forEach((button) => cacheGroup.append(button));
  cacheGroup.append(clearAppCacheButton);
}
