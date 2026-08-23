export function resolvePreferredDisplayName({
  loginName = "",
  sessionDisplayName = "",
  profileDisplayName = "",
  fallback = "",
}) {
  if (
    profileDisplayName &&
    !(loginName && profileDisplayName === loginName && sessionDisplayName && sessionDisplayName !== loginName)
  ) {
    return profileDisplayName;
  }
  return sessionDisplayName || profileDisplayName || fallback;
}

export function mergeLoginState({
  cloudDate = "",
  cloudStreak = 0,
  localDate = "",
  localStreak = 0,
  today = "",
}) {
  let lastLoginDate = cloudDate || localDate || "";
  let loginStreak = Math.max(0, Number(cloudStreak) || 0);
  const safeLocalStreak = Math.max(0, Number(localStreak) || 0);
  if (localDate && (!cloudDate || localDate > cloudDate)) {
    lastLoginDate = localDate;
    loginStreak = safeLocalStreak;
  } else if (localDate && localDate === cloudDate) {
    loginStreak = Math.max(loginStreak, safeLocalStreak);
  }
  if (lastLoginDate === today) loginStreak = Math.max(1, loginStreak);
  return { lastLoginDate, loginStreak };
}

export function resolvePreferredHomeName({ cloudName = "", localName = "", defaultName = "咻蛋之家" }) {
  return cloudName && (cloudName !== defaultName || localName === defaultName) ? cloudName : localName;
}

export function getProfileCapabilities(profile = {}) {
  return {
    foodOptions: Object.prototype.hasOwnProperty.call(profile, "food_options"),
    thanksColor: Object.prototype.hasOwnProperty.call(profile, "preferred_thanks_color"),
    preferences:
      Object.prototype.hasOwnProperty.call(profile, "theme_preference") &&
      Object.prototype.hasOwnProperty.call(profile, "home_name"),
  };
}
