import {
  getProfileCapabilities,
  mergeLoginState,
  resolvePreferredDisplayName,
  resolvePreferredHomeName,
} from "./account-sync-domain.js";
import { normalizeFoodOptions } from "./food-wheel-view.js";
import {
  recipeFromCloudRow,
  weekendFromCloudRow,
  weekendToCloudRow,
  wishFromCloudRow,
} from "./cloud-models.js";
import { getVipLevel, getVipLevelByRecharge } from "./vip-center.js";

export function createAccountSyncController({
  elements,
  state,
  householdRepository,
  photoFavorites,
  defaultFoodOptions,
  isMissingCloudSchema,
  getProfileAvatarUrl,
  saveCachedAvatarUrl,
  renderAccountAvatar,
  getSessionDisplayName,
  renderSettingsSummary,
  normalizeHomeName,
  loadHomeName,
  normalizeFamilyTagline,
  loadFamilyTagline,
  applyHomeName,
  applyFamilyTagline,
  renderFamilyDialog,
  renderGratitudeNotes,
  loadWeekendPlans,
  saveWeekendPlans,
  renderWeekendPlans,
  setWeekendStatus,
  loadRechargeTotal,
  loadLocalExperienceAliases,
  loadFoodOptions,
  loadThanksColor,
  isVipUser,
  normalizeNickname,
  getSessionLoginName,
  getLocalDateKey,
  normalizeLoginDateKey,
  normalizeTheme,
  loadTheme,
  normalizeThanksColor,
  getDailyLoginReward,
  isYesterdayLoginDate,
  updateSessionDisplayName,
  applyTheme,
  saveThanksColorPreference,
  setSelectedThanksColor,
  saveRechargeTotal,
  saveExperience,
  getTodayExperienceStorageKey,
  saveRecipes,
  saveFoodOptionsCache,
  renderExperience,
  renderVipCenter,
  renderRecipes,
  renderWishes,
  renderFoodWheel,
  synchronizeAnniversaries,
  loadPhotos,
  loadSecretItems,
  loadNotifications,
  refreshStorage,
  cloudflareRequest,
  isAdminAccount,
  setGlobalStatus,
  awardDailyExperience,
}) {
  const els = elements;

  async function loadFamilyContext() {
    state.familyInfo = null;
    state.familyMembers = [];
    state.familyInvitations = [];
    state.familyMemberMap = new Map();
    if (!state.cloudDb || !state.session) return;
  
    const [membersResult, invitationsResult] = await Promise.all([
      state.cloudDb.rpc("get_my_family_members"),
      state.cloudDb.rpc("get_my_family_invitations"),
    ]);
    if (membersResult.error || invitationsResult.error) {
      const error = membersResult.error || invitationsResult.error;
      if (!isMissingCloudSchema(error)) {
        console.warn("Family context failed:", error);
      }
      return;
    }
  
    state.familyMembers = membersResult.data || [];
    state.familyInvitations = invitationsResult.data || [];
    state.familyMembers.forEach((member) => {
      state.familyMemberMap.set(member.user_id, member);
      const avatarUrl = getProfileAvatarUrl(member);
      if (avatarUrl) saveCachedAvatarUrl(member.user_id, avatarUrl);
    });
    const ownMember = state.familyMemberMap.get(state.session.user.id);
    const ownMemberAvatar = getProfileAvatarUrl(ownMember || {});
    if (ownMemberAvatar) {
      saveCachedAvatarUrl(state.session.user.id, ownMemberAvatar);
      if (!getProfileAvatarUrl(state.accountProfile)) {
        state.accountProfile.avatarUrl = ownMemberAvatar;
        state.accountProfile.avatarPath = ownMember.avatar_path || state.accountProfile.avatarPath;
        renderAccountAvatar(ownMemberAvatar, getSessionDisplayName());
        renderSettingsSummary();
      }
    }
    if (state.familyMembers.length) {
      state.familyInfo = {
        id: state.familyMembers[0].family_id,
        name: normalizeHomeName(state.familyMembers[0].family_name) || loadHomeName(),
        tagline: normalizeFamilyTagline(state.familyMembers[0].family_tagline) || loadFamilyTagline(),
        isOwner: state.familyMembers.some(
          (member) => member.user_id === state.session.user.id && member.role === "owner"
        ),
      };
      applyHomeName(state.familyInfo.name, { persist: true });
      applyFamilyTagline(state.familyInfo.tagline, { persist: true });
    } else {
      applyFamilyTagline(loadFamilyTagline(), { persist: false });
    }
    renderFamilyDialog();
  }
  
  async function loadGratitudeNotes() {
    if (!state.cloudDb || !state.session) {
      state.gratitudeNotes = [];
      renderGratitudeNotes();
      return;
    }
  
    const { data, error } = await householdRepository.list("gratitude_notes", {
      order: [{ column: "created_at", ascending: false }],
    });
    if (error) {
      state.gratitudeNotes = [];
      els.thanksStatus.textContent = isMissingCloudSchema(error)
        ? "请先部署最新版 Cloudflare D1 结构，启用感谢留言板。"
        : `留言读取失败：${error.message}`;
    } else {
      state.gratitudeNotes = data || [];
      els.thanksStatus.textContent = "";
    }
    renderGratitudeNotes();
  }
  
  async function synchronizeWeekendPlans(userId = state.session?.user?.id) {
    if (!state.cloudDb || !state.session || !userId) return;
    try {
      const { data, error } = await householdRepository.list("weekend_plans", {
        order: [{ column: "plan_date", ascending: true }],
      });
      if (error) throw error;
  
      let cloudPlans = data || [];
      const localPlans = loadWeekendPlans();
      const cloudIds = new Set(cloudPlans.map((plan) => plan.id));
      const missingLocalPlans = localPlans.filter(
        (plan) => (!plan.userId || plan.userId === userId) && !cloudIds.has(plan.id)
      );
      if (missingLocalPlans.length) {
        const { error: migrateError } = await householdRepository.upsert(
          "weekend_plans",
          missingLocalPlans.map((plan) => weekendToCloudRow(plan, userId)),
          { onConflict: "id" }
        );
        if (migrateError) throw migrateError;
        const refreshed = await householdRepository.list("weekend_plans", {
          order: [{ column: "plan_date", ascending: true }],
        });
        if (refreshed.error) throw refreshed.error;
        cloudPlans = refreshed.data || [];
      }
  
      state.weekendCloudAvailable = true;
      state.weekendPlans = cloudPlans.map(weekendFromCloudRow);
      saveWeekendPlans();
      renderWeekendPlans();
    } catch (error) {
      state.weekendCloudAvailable = false;
      if (isMissingCloudSchema(error)) {
        setWeekendStatus("周末计划云表尚未初始化，暂时保存在当前浏览器。");
      } else {
        setWeekendStatus(`周末计划同步失败：${error.message || "请稍后重试"}`);
      }
    }
  }
  
  async function synchronizeAccountData() {
    if (!state.cloudDb || !state.session) return;
    if (state.cloudSyncInFlight) return state.cloudSyncInFlight;
  
    const userId = state.session.user.id;
    const displayName = getSessionDisplayName();
    state.cloudSyncInFlight = (async () => {
      try {
        setGlobalStatus("正在同步账户数据…");
        await loadFamilyContext();
        const [profileResult, recipesResult, wishesResult] = await Promise.all([
          householdRepository.list("user_profiles", {
            filters: { user_id: userId },
            maybeSingle: true,
          }),
          householdRepository.list("recipes", {
            order: [{ column: "created_at", ascending: false }],
          }),
          householdRepository.list("wishes", {
            order: [{ column: "created_at", ascending: false }],
          }),
        ]);
  
        const firstError = profileResult.error || recipesResult.error || wishesResult.error;
        if (firstError) throw firstError;
        if (!state.session || state.session.user.id !== userId) return;
  
        const localRecharge = loadRechargeTotal(displayName);
        const localExperience = loadLocalExperienceAliases(displayName);
        const localFoodOptions = loadFoodOptions(userId);
        const localThanksColor = loadThanksColor(userId);
        let profile = profileResult.data;
  
        if (!profile) {
          const initialRecharge = Math.max(localRecharge, isVipUser(displayName) ? 298 : 0);
          const { data, error } = await householdRepository.insert(
            "user_profiles",
            {
              user_id: userId,
              username: displayName,
              recharge_total: initialRecharge,
              vip_level: getVipLevelByRecharge(initialRecharge)?.level || 0,
              experience_total: localExperience.total,
              last_login_date: localExperience.lastLoginDate || null,
              login_streak: Math.max(0, Number(localExperience.loginStreak) || 0),
              secret_default_folder_id: null,
            },
            { select: "*", single: true }
          );
          if (error) throw error;
          profile = data;
        }
  
        state.secretDefaultFolderId = String(profile.secret_default_folder_id || "");
        if (state.secretDefaultFolderId === "unfiled") state.secretDefaultFolderId = "";
  
        const loginName = normalizeNickname(getSessionLoginName());
        const sessionDisplayName = normalizeNickname(getSessionDisplayName());
        const profileDisplayName = normalizeNickname(profile.username);
        const preferredDisplayName = resolvePreferredDisplayName({
          loginName,
          sessionDisplayName,
          profileDisplayName,
          fallback: displayName,
        });
        if (preferredDisplayName && preferredDisplayName !== getSessionDisplayName()) {
          updateSessionDisplayName(preferredDisplayName);
        }
  
        const cloudRecipes = recipesResult.data || [];
        const cloudWishes = wishesResult.data || [];
  
        const today = getLocalDateKey();
        let rechargeTotal = Math.max(
          Number(profile.recharge_total) || 0,
          isVipUser(displayName) ? 298 : 0
        );
        let experienceTotal = Math.max(
          Number(profile.experience_total) || 0,
          Number(localExperience.total) || 0
        );
        const cloudLastLoginDate = normalizeLoginDateKey(profile.last_login_date);
        const localLastLoginDate = normalizeLoginDateKey(localExperience.lastLoginDate);
        let { lastLoginDate, loginStreak } = mergeLoginState({
          cloudDate: cloudLastLoginDate,
          cloudStreak: profile.login_streak,
          localDate: localLastLoginDate,
          localStreak: localExperience.loginStreak,
          today,
        });
        let todayExperienceDate = profile.today_experience_date || "";
        let todayExperienceAmount = todayExperienceDate === today
          ? Math.max(0, Number(profile.today_experience_amount) || 0)
          : 0;
        const cloudFoodOptions = normalizeFoodOptions(profile.food_options);
        const preferredFoodOptions = cloudFoodOptions.length
          ? cloudFoodOptions
          : localFoodOptions;
        const cloudTheme = normalizeTheme(profile.theme_preference);
        const preferredTheme = cloudTheme || loadTheme(userId);
        const cloudHomeName = normalizeHomeName(state.familyInfo?.name || profile.home_name);
        const localHomeName = loadHomeName(userId);
        const preferredHomeName = resolvePreferredHomeName({
          cloudName: cloudHomeName,
          localName: localHomeName,
        });
        const cloudThanksColor = normalizeThanksColor(profile.preferred_thanks_color);
        const preferredThanksColor =
          Object.prototype.hasOwnProperty.call(profile, "preferred_thanks_color") &&
          cloudThanksColor
            ? cloudThanksColor
            : localThanksColor;
        const capabilities = getProfileCapabilities(profile);
        state.foodOptionsCloudAvailable = capabilities.foodOptions;
        state.thanksColorCloudAvailable = capabilities.thanksColor;
        state.profilePreferencesCloudAvailable = capabilities.preferences;
  
        const vipLevel = getVipLevelByRecharge(rechargeTotal)?.level || 0;
        let loginRewardGained = 0;
        if (lastLoginDate !== today) {
          loginStreak = isYesterdayLoginDate(lastLoginDate) ? loginStreak + 1 : 1;
          loginRewardGained = getDailyLoginReward(loginStreak, vipLevel);
          experienceTotal += loginRewardGained;
          todayExperienceAmount += loginRewardGained;
        }
        lastLoginDate = today;
        todayExperienceDate = today;
  
        const profileUpdates = {
          username: preferredDisplayName,
          recharge_total: rechargeTotal,
          vip_level: vipLevel,
          experience_total: experienceTotal,
          last_login_date: lastLoginDate,
          today_experience_date: todayExperienceDate,
          today_experience_amount: todayExperienceAmount,
          secret_default_folder_id: state.secretDefaultFolderId || null,
          updated_at: new Date().toISOString(),
        };
        profileUpdates.login_streak = loginStreak;
        if (state.foodOptionsCloudAvailable) {
          profileUpdates.food_options = preferredFoodOptions;
        }
        if (state.profilePreferencesCloudAvailable) {
          profileUpdates.theme_preference = preferredTheme;
          profileUpdates.home_name = preferredHomeName;
        }
        if (state.thanksColorCloudAvailable) {
          profileUpdates.preferred_thanks_color = preferredThanksColor;
        }
  
        const { data: savedProfile, error: profileError } = await householdRepository.update(
          "user_profiles",
          profileUpdates,
          { user_id: userId },
          { select: "*", single: true }
        );
        if (profileError) throw profileError;
  
        const familyAvatarProfile = state.familyMemberMap.get(userId) || {};
        const syncedAvatarProfile = {
          avatar_url:
            savedProfile.avatar_url ||
            profile.avatar_url ||
            familyAvatarProfile.avatar_url ||
            state.accountProfile.avatarUrl ||
            "",
          avatar_path:
            savedProfile.avatar_path ||
            profile.avatar_path ||
            familyAvatarProfile.avatar_path ||
            state.accountProfile.avatarPath ||
            "",
        };
        const syncedAvatarUrl =
          getProfileAvatarUrl(syncedAvatarProfile) || loadCachedAvatarUrl(userId);
        const syncedAvatarPath = syncedAvatarProfile.avatar_path;
        if (syncedAvatarUrl) saveCachedAvatarUrl(userId, syncedAvatarUrl);
  
        state.cloudSyncAvailable = true;
        state.accountDataState = "ready";
        state.accountProfile = {
          rechargeTotal: Number(savedProfile.recharge_total) || 0,
          vipLevel: Number(savedProfile.vip_level) || 0,
          experienceTotal: Number(savedProfile.experience_total) || 0,
          lastLoginDate: savedProfile.last_login_date || "",
          loginStreak: Math.max(0, Number(savedProfile.login_streak) || loginStreak || 0),
          todayExperienceDate: savedProfile.today_experience_date || todayExperienceDate,
          todayExperienceAmount: Math.max(0, Number(savedProfile.today_experience_amount) || 0),
          themePreference: preferredTheme,
          homeName: preferredHomeName,
          familyTagline: loadFamilyTagline(),
          thanksColor: state.thanksColorCloudAvailable
            ? normalizeThanksColor(savedProfile.preferred_thanks_color)
            : preferredThanksColor,
          avatarUrl: syncedAvatarUrl,
          avatarPath: syncedAvatarPath,
          foodOptions: state.foodOptionsCloudAvailable
            ? normalizeFoodOptions(savedProfile.food_options)
            : localFoodOptions,
        };
        applyTheme(preferredTheme, { userId, syncCloud: false });
        applyHomeName(preferredHomeName, { persist: true, userId });
        renderAccountAvatar(state.accountProfile.avatarUrl, preferredDisplayName);
        saveThanksColorPreference(state.accountProfile.thanksColor, { userId, syncCloud: false });
        setSelectedThanksColor(state.accountProfile.thanksColor);
        state.recipes = cloudRecipes.map(recipeFromCloudRow);
        state.wishes = cloudWishes.map(wishFromCloudRow);
        state.foodOptions = state.accountProfile.foodOptions.length
          ? state.accountProfile.foodOptions
          : [...defaultFoodOptions];
  
        saveRechargeTotal(state.accountProfile.rechargeTotal, preferredDisplayName);
        saveExperience(
          {
            total: state.accountProfile.experienceTotal,
            lastLoginDate: state.accountProfile.lastLoginDate,
            loginStreak: state.accountProfile.loginStreak,
            gainedToday: state.accountProfile.lastLoginDate === today,
          },
          preferredDisplayName
        );
        localStorage.setItem(
          getTodayExperienceStorageKey(userId),
          JSON.stringify({ date: state.accountProfile.todayExperienceDate, amount: state.accountProfile.todayExperienceAmount })
        );
        saveRecipes();
        saveFoodOptionsCache(userId);
  
        state.activeVipLevel = state.accountProfile.vipLevel;
        document.body.classList.toggle("vip-member", state.activeVipLevel > 0);
        document.body.dataset.vipLevel = String(state.activeVipLevel);
        els.vipPopoverBadge.textContent =
          state.activeVipLevel > 0
            ? `${preferredHomeName} ${getVipLevel(state.activeVipLevel).label}`
            : `开通 ${preferredHomeName} VIP`;
        renderExperience(preferredDisplayName);
        renderVipCenter();
        renderRecipes();
        renderWishes();
        renderFoodWheel();
        await synchronizeWeekendPlans(userId);
        await synchronizeAnniversaries(userId);
        await loadGratitudeNotes();
        await loadPhotos();
        await loadSecretItems();
        await loadNotifications();
        updateCloudSyncStatus();
        void refreshStorage(cloudflareRequest, () => Boolean(state.session && isAdminAccount()));
      } catch (error) {
        state.cloudSyncAvailable = false;
        state.accountDataState = "error";
        renderWishes();
        awardDailyExperience(displayName);
        renderExperience(displayName);
        if (isMissingCloudSchema(error)) {
          setGlobalStatus("Cloudflare D1 尚未初始化，请先部署最新版数据库结构。");
        } else {
          setGlobalStatus(`云同步失败：${error.message || "请稍后重试"}`);
        }
      } finally {
        state.cloudSyncInFlight = null;
      }
    })();
  
    return state.cloudSyncInFlight;
  }
  
  function updateCloudSyncStatus() {
    if (!state.session || !state.cloudSyncAvailable) return;
    if (!isAdminAccount()) {
      setGlobalStatus("");
      return;
    }
    const missing = [];
    if (!state.photoFlagsCloudAvailable) missing.push("置顶/精选");
    if (!photoFavorites.cloudAvailable) missing.push("收藏");
    if (!state.weekendCloudAvailable) missing.push("周末计划");
    if (!state.anniversaryCloudAvailable) missing.push("纪念日");
    if (!state.foodOptionsCloudAvailable) missing.push("转盘候选");
    if (!state.profilePreferencesCloudAvailable) missing.push("主题/主页名称");
    if (!state.thanksColorCloudAvailable) missing.push("留言颜色");
    if (!state.secretCloudAvailable) missing.push("秘藏");
    setGlobalStatus(
      missing.length
        ? `Cloudflare D1 仍缺少：${missing.join("、")}。请部署最新版数据库结构。`
        : "全部账户数据已同步到云端"
    );
  }
  
  
  return {
    loadFamilyContext,
    loadGratitudeNotes,
    synchronizeWeekendPlans,
    synchronizeAccountData,
    updateCloudSyncStatus,
  };
}
