import { confirmAction } from "./confirm-dialog.js";
import {
  buildFamilyInvitationsMarkup,
  buildFamilyMembersMarkup,
  buildFamilyOutgoingInvitationsMarkup,
  buildSettingsFamilyMarkup,
} from "./account-view.js";
import { recipeFromCloudRow, wishFromCloudRow } from "./cloud-models.js";

export function createFamilySettingsController({
  elements,
  state,
  r2UploadEndpoint,
  householdRepository,
  renderAvatarMarkup,
  loadFamilyLevelProfiles,
  loadPhotos,
  synchronizeWeekendPlans,
  synchronizeAnniversaries,
  loadGratitudeNotes,
  loadSecretItems,
  renderRecipes,
  renderWishes,
  renderWeekendPlans,
  renderAnniversaries,
  isMissingCloudSchema,
  loadFamilyContext,
}) {
  const els = elements;

  function renderFamilyDialog() {
    if (!els.familyDialog) return;
    const hasFamily = Boolean(state.familyInfo);
    renderSettingsFamilyPanel();
    els.familyEmpty.hidden = hasFamily;
    els.familyContent.hidden = !hasFamily;
    if (!hasFamily) {
      els.familyMembers.innerHTML = "";
      const incoming = state.familyInvitations.filter((invitation) => invitation.is_incoming);
      els.familyInvitations.innerHTML = buildFamilyInvitationsMarkup(incoming);
      els.familyInvitations.querySelectorAll("[data-family-response]").forEach((button) => {
        button.addEventListener("click", () =>
          respondFamilyInvitation(button.dataset.familyResponse, button.dataset.accept === "true")
        );
      });
      return;
    }
  
    els.familyInvitations.innerHTML = "";
    els.familyName.textContent = state.familyInfo.name;
    els.familyInviteForm.hidden = !state.familyInfo.isOwner;
    els.familyMembers.innerHTML = buildFamilyMembersMarkup({
      members: state.familyMembers,
      currentUserId: state.session?.user?.id || "",
      owner: state.familyInfo.isOwner,
      renderAvatar: renderAvatarMarkup,
    });
    els.familyMembers.querySelectorAll("[data-remove-family-member]").forEach((button) => {
      button.addEventListener("click", () => removeFamilyMember(button.dataset.removeFamilyMember));
    });
    const outgoing = state.familyInvitations.filter((invitation) => !invitation.is_incoming);
    els.familyOutgoingInvitations.innerHTML = buildFamilyOutgoingInvitationsMarkup(outgoing);
  }
  
  function renderSettingsFamilyPanel() {
    if (!els.settingsFamilyPanel) return;
    els.settingsFamilyPanel.innerHTML = buildSettingsFamilyMarkup({
      signedIn: Boolean(state.session),
      familyInfo: state.familyInfo,
      members: state.familyMembers,
      invitations: state.familyInvitations,
      currentUserId: state.session?.user?.id || "",
      renderAvatar: renderAvatarMarkup,
    });
    bindSettingsFamilyActions();
  }
  async function readSignupInviteCode(button) {
    if (!state.session?.access_token || !state.familyInfo?.isOwner) return;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "读取中…";
    try {
      const response = await fetch(`${r2UploadEndpoint}/api/admin/signup-invite`, {
        headers: { Authorization: `Bearer ${state.session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.data?.code) {
        throw new Error(payload?.error || "暂时无法读取邀请码");
      }
      const container = button.closest(".settings-family-invite-code");
      const value = container?.querySelector("[data-settings-signup-invite-value]");
      if (value) {
        value.hidden = false;
        value.textContent = String(payload.data.code);
      }
      try {
        await navigator.clipboard?.writeText(String(payload.data.code));
      } catch {}
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = originalLabel;
      }, 1800);
    } catch (error) {
      console.error("read signup invite failed", error);
      button.textContent = "获取失败";
      window.setTimeout(() => {
        button.textContent = originalLabel;
      }, 1800);
    } finally {
      button.disabled = false;
    }
  }
  
  function bindSettingsFamilyActions() {
    els.settingsFamilyPanel
      ?.querySelectorAll("[data-settings-family-response]")
      .forEach((button) => {
        button.addEventListener("click", () =>
          respondFamilyInvitation(
            button.dataset.settingsFamilyResponse,
            button.dataset.accept === "true"
          )
        );
      });
    els.settingsFamilyPanel
      ?.querySelector("[data-settings-signup-invite]")
      ?.addEventListener("click", (event) => readSignupInviteCode(event.currentTarget));
  }
  
  async function refreshSharedContent() {
    if (!state.cloudDb || !state.session) return;
    await loadFamilyLevelProfiles();
    const [recipesResult, wishesResult] = await Promise.all([
      householdRepository.list("recipes", {
        order: [{ column: "created_at", ascending: false }],
      }),
      householdRepository.list("wishes", {
        order: [{ column: "created_at", ascending: false }],
      }),
    ]);
    if (!recipesResult.error) state.recipes = (recipesResult.data || []).map(recipeFromCloudRow);
    if (!wishesResult.error) state.wishes = (wishesResult.data || []).map(wishFromCloudRow);
    await Promise.all([
      loadPhotos(),
      synchronizeWeekendPlans(state.session.user.id),
      synchronizeAnniversaries(state.session.user.id),
      loadGratitudeNotes(),
      loadSecretItems(),
    ]);
    renderRecipes();
    renderWishes();
    renderWeekendPlans();
    renderAnniversaries();
  }
  
  async function createFamily(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session) return;
    els.familyStatus.textContent = "正在创建家庭组...";
    const { error } = await state.cloudDb.rpc("create_family", {
      p_name: els.familyNameInput.value.trim() || "我们的家",
    });
    if (error) {
      els.familyStatus.textContent = isMissingCloudSchema(error)
        ? "请先部署最新版 Cloudflare D1 结构。"
        : `创建失败：${error.message}`;
      return;
    }
    els.createFamilyForm.reset();
    await loadFamilyContext();
    els.familyStatus.textContent = "家庭组已创建。现在可以输入另一位用户的用户名。";
    await refreshSharedContent();
  }
  
  async function addFamilyMember(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session || !state.familyInfo?.isOwner) return;
    const username = els.familyUsernameInput.value.trim();
    if (!username) return;
    els.familyStatus.textContent = "正在添加家庭成员...";
    const { error } = await state.cloudDb.rpc("add_family_member_by_username", {
      p_username: username,
    });
    if (error) {
      els.familyStatus.textContent = `添加失败：${error.message}`;
      return;
    }
    els.familyInviteForm.reset();
    await loadFamilyContext();
    els.familyStatus.textContent = `已向 ${username} 发送邀请，等对方登录后接受。`;
  }
  
  async function respondFamilyInvitation(invitationId, accept) {
    if (!state.cloudDb || !state.session) return;
    els.familyStatus.textContent = accept ? "正在加入家庭..." : "正在拒绝邀请...";
    const { error } = await state.cloudDb.rpc("respond_family_invitation", {
      p_invitation_id: invitationId,
      p_accept: accept,
    });
    if (error) {
      els.familyStatus.textContent = `处理邀请失败：${error.message}`;
      return;
    }
    await loadFamilyContext();
    els.familyStatus.textContent = accept ? "已加入家庭，正在同步共同生活记录。" : "已拒绝邀请。";
    if (accept) await refreshSharedContent();
  }
  
  async function removeFamilyMember(userId) {
    const member = state.familyMembers.find((item) => item.user_id === userId);
    if (!member) return;
    const confirmed = await confirmAction({
      eyebrow: "家庭成员管理",
      title: `移出 ${member.username}？`,
      message: "对方将无法继续查看家庭共享内容，自己的私人数据不会被删除。",
      confirmLabel: "移出家庭",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed) return;
    const { error } = await state.cloudDb.rpc("remove_family_member", { p_user_id: userId });
    if (error) {
      els.familyStatus.textContent = `移除失败：${error.message}`;
      return;
    }
    await loadFamilyContext();
    els.familyStatus.textContent = `${member.username} 已移出家庭组。`;
    await refreshSharedContent();
  }
  
  
  return {
    renderFamilyDialog,
    renderSettingsFamilyPanel,
    readSignupInviteCode,
    bindSettingsFamilyActions,
    refreshSharedContent,
    createFamily,
    addFamilyMember,
    respondFamilyInvitation,
    removeFamilyMember,
  };
}
