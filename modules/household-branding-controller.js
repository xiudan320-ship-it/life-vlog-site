import {
  normalizeFamilyTagline,
  normalizeHomeName,
} from "./app-domain.js";

export function createHouseholdBrandingController({
  elements,
  state,
  preferenceStore,
  keys,
  defaults,
  renderSettingsSummary,
  setHint,
  documentTarget = document,
}) {
  const els = elements;

  function saveConfig() {
    els.setupPanel.hidden = true;
    setHint("Cloudflare 已接管登录、数据库和图片存储。");
  }

  function getHomeNameStorageKey(userId = state.session?.user?.id || null) {
    return userId ? preferenceStore.scopedKey(keys.homeName, userId) : keys.homeName;
  }

  function getFamilyTaglineStorageKey(
    familyId = state.familyInfo?.id || state.session?.user?.id || "guest"
  ) {
    return preferenceStore.scopedKey(keys.familyTagline, familyId || "guest");
  }

  function loadFamilyTagline() {
    return normalizeFamilyTagline(preferenceStore.read(getFamilyTaglineStorageKey())) || defaults.familyTagline;
  }

  function applyFamilyTagline(value, { persist = false } = {}) {
    const tagline = normalizeFamilyTagline(value) || defaults.familyTagline;
    if (els.heroSignature) els.heroSignature.textContent = tagline;
    state.accountProfile.familyTagline = tagline;
    if (persist) preferenceStore.write(getFamilyTaglineStorageKey(), tagline);
    const settingsValue = documentTarget.querySelector("#settingsFamilyTaglineValue");
    if (settingsValue) settingsValue.textContent = tagline;
    return tagline;
  }

  function loadHomeName(userId = state.session?.user?.id || null) {
    return normalizeHomeName(preferenceStore.read(getHomeNameStorageKey(userId))) || defaults.homeName;
  }

  function applyHomeName(
    value,
    { persist = false, userId = state.session?.user?.id || null } = {}
  ) {
    const homeName = normalizeHomeName(value) || defaults.homeName;
    els.brandName.textContent = homeName;
    els.heroHomeName.textContent = homeName;
    els.vipHomeName.textContent = homeName;
    els.brandName.title = homeName;
    els.heroHomeName.classList.toggle("long-home-name", Array.from(homeName).length > 8);
    documentTarget.title = homeName;
    state.accountProfile.homeName = homeName;
    if (persist && userId) {
      preferenceStore.write(getHomeNameStorageKey(userId), homeName);
    }
    renderSettingsSummary();
    return homeName;
  }

  return {
    applyFamilyTagline,
    applyHomeName,
    getFamilyTaglineStorageKey,
    getHomeNameStorageKey,
    loadFamilyTagline,
    loadHomeName,
    normalizeFamilyTagline,
    normalizeHomeName,
    saveConfig,
  };
}
