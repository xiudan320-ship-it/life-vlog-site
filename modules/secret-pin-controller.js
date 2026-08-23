export function createSecretPinController({
  elements,
  pinKey,
  unlockKey,
  maxUnlockMs,
  getSession,
  openSecretPage,
}) {
  const els = elements;
  let entry = "";
  let setupValue = "";
  let mode = "unlock";
  let manageMode = false;
  let unlockedAt = 0;
  let leftAt = 0;

  function getPinStorageKey() {
    return `${pinKey}:${getSession()?.user?.id || "guest"}`;
  }

  function getUnlockStorageKey() {
    return `${unlockKey}:${getSession()?.user?.id || "guest"}`;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  async function hashPin(pin, salt) {
    const encoded = new TextEncoder().encode(`${salt}:${pin}`);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return bytesToHex(new Uint8Array(digest));
  }

  function readPinRecord() {
    if (!getSession()) return null;
    try {
      const record = JSON.parse(localStorage.getItem(getPinStorageKey()) || "null");
      return record?.salt && record?.hash ? record : null;
    } catch {
      return null;
    }
  }

  function restoreUnlockState() {
    if (!getSession()) return;
    try {
      const state = JSON.parse(sessionStorage.getItem(getUnlockStorageKey()) || "null");
      unlockedAt = Number(state?.unlockedAt) || 0;
      leftAt = Number(state?.leftAt) || 0;
    } catch {
      unlockedAt = 0;
      leftAt = 0;
    }
  }

  function persistUnlockState() {
    if (!getSession()) return;
    sessionStorage.setItem(getUnlockStorageKey(), JSON.stringify({ unlockedAt, leftAt }));
  }

  function clearUnlockState() {
    if (getSession()) sessionStorage.removeItem(getUnlockStorageKey());
    unlockedAt = 0;
    leftAt = 0;
  }

  function isUnlocked() {
    restoreUnlockState();
    const now = Date.now();
    const withinMaximum = unlockedAt > 0 && now - unlockedAt < maxUnlockMs;
    const stayedInside = !leftAt || leftAt <= unlockedAt;
    if (withinMaximum && stayedInside) return true;
    clearUnlockState();
    return false;
  }

  function markLeft() {
    if (!unlockedAt) return;
    leftAt = Date.now();
    persistUnlockState();
  }

  function renderEntry() {
    const count = entry.length;
    els.secretPinDots?.querySelectorAll("i").forEach((dot, index) => {
      dot.classList.toggle("filled", index < count);
    });
  }

  function setStatus(message = "", kind = "") {
    if (!els.secretPinStatus) return;
    els.secretPinStatus.textContent = message;
    els.secretPinStatus.dataset.kind = kind;
  }

  function setDialogMode(nextMode) {
    mode = nextMode;
    entry = "";
    renderEntry();
    setStatus("");
    const copy = {
      unlock: ["输入密码", "请输入 4 位数字密码进入秘藏", "进入秘藏"],
      setup: ["设置密码", "设置一个 4 位数字密码", "下一步"],
      confirm: ["确认密码", "再次输入刚才的 4 位密码", "确认设置"],
      "change-current": ["验证当前密码", "先输入现有的 4 位密码", "继续"],
      "change-new": ["设置新密码", "输入新的 4 位数字密码", "下一步"],
      "change-confirm": ["确认新密码", "再次输入新的 4 位密码", "确认修改"],
    }[nextMode] || ["输入密码", "请输入 4 位数字密码", "确认"];
    if (els.secretPinTitle) els.secretPinTitle.textContent = copy[0];
    if (els.secretPinHint) els.secretPinHint.textContent = copy[1];
    if (els.secretPinSubmit) els.secretPinSubmit.textContent = copy[2];
  }

  function openDialog() {
    manageMode = false;
    setupValue = "";
    setDialogMode(readPinRecord() ? "unlock" : "setup");
    els.secretPinDialog?.showModal();
  }

  function openSettings() {
    manageMode = true;
    setupValue = "";
    setDialogMode(readPinRecord() ? "change-current" : "setup");
  }

  function finishUnlock() {
    manageMode = false;
    unlockedAt = Date.now();
    leftAt = 0;
    persistUnlockState();
    els.secretPinDialog?.close();
    openSecretPage();
  }

  async function submitEntry() {
    if (entry.length !== 4) return;
    const pin = entry;
    if (mode === "change-current") {
      const record = readPinRecord();
      if (record && await hashPin(pin, record.salt) === record.hash) {
        setDialogMode("change-new");
        return;
      }
      entry = "";
      renderEntry();
      setStatus("当前密码不正确，请再试一次", "error");
      return;
    }
    if (mode === "setup" || mode === "change-new") {
      setupValue = pin;
      setDialogMode(mode === "setup" ? "confirm" : "change-confirm");
      return;
    }
    if (mode === "confirm" || mode === "change-confirm") {
      if (pin !== setupValue) {
        setDialogMode(mode === "confirm" ? "setup" : "change-new");
        setStatus("两次输入不一致，请重新设置", "error");
        return;
      }
      const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await hashPin(pin, salt);
      localStorage.setItem(getPinStorageKey(), JSON.stringify({ salt, hash, version: 1 }));
      if (manageMode) {
        manageMode = false;
        setStatus("秘藏密码已更新", "success");
        window.setTimeout(() => els.secretPinDialog?.close(), 350);
        return;
      }
      finishUnlock();
      return;
    }
    const record = readPinRecord();
    if (record && await hashPin(pin, record.salt) === record.hash) {
      finishUnlock();
      return;
    }
    entry = "";
    renderEntry();
    setStatus("密码不正确，请再试一次", "error");
  }

  function appendDigit(digit) {
    if (!/^\d$/.test(digit) || entry.length >= 4) return;
    entry += digit;
    renderEntry();
    setStatus("");
    if (entry.length === 4) window.setTimeout(() => void submitEntry(), 110);
  }

  function deleteDigit() {
    entry = entry.slice(0, -1);
    renderEntry();
    setStatus("");
  }

  function resetSession() {
    unlockedAt = 0;
    leftAt = 0;
    entry = "";
    setupValue = "";
    manageMode = false;
    els.secretPinDialog?.close();
  }

  return {
    appendDigit,
    clearUnlockState,
    deleteDigit,
    isUnlocked,
    markLeft,
    openDialog,
    openSettings,
    resetManageMode: () => { manageMode = false; },
    resetSession,
  };
}
