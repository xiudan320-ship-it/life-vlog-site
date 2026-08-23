import { escapeHtml } from "./ui-formatters.js";

export function buildSettingsToolOrderMarkup(order = [], labels = {}) {
  return order.map((id, index) => {
    const meta = labels[id] || { title: id, subtitle: "" };
    return `
      <article class="settings-tool-card" data-tool-order-id="${escapeHtml(id)}">
        <div class="settings-tool-copy">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(meta.title)}</strong>
          <small>${escapeHtml(meta.subtitle)}</small>
        </div>
        <div class="settings-tool-actions">
          <button type="button" data-tool-order-move="${escapeHtml(id)}:-1" aria-label="上移${escapeHtml(meta.title)}" title="上移" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-tool-order-move="${escapeHtml(id)}:1" aria-label="下移${escapeHtml(meta.title)}" title="下移" ${index === order.length - 1 ? "disabled" : ""}>↓</button>
        </div>
      </article>
    `;
  }).join("");
}

export function buildSettingsAccountOverviewMarkup({
  signedIn = false,
  displayName = "未登录",
  username = "",
  avatarMarkup = "",
}) {
  return `
    <div class="settings-account-avatar">${avatarMarkup}</div>
    <div><strong>${escapeHtml(displayName)}</strong><span>@${escapeHtml(username || displayName)}</span><small>${signedIn ? "账户已安全同步到 Cloudflare" : "请先登录"}</small></div>`;
}

export function buildFamilyInvitationsMarkup(invitations = []) {
  return invitations.map((invitation) => `
    <article class="family-invitation">
      <div>
        <span>${escapeHtml(invitation.inviter_username)} 邀请你加入</span>
        <strong>${escapeHtml(invitation.family_name)}</strong>
      </div>
      <span class="family-invitation-actions">
        <button type="button" data-family-response="${escapeHtml(invitation.invitation_id)}" data-accept="true">接受</button>
        <button type="button" data-family-response="${escapeHtml(invitation.invitation_id)}" data-accept="false">拒绝</button>
      </span>
    </article>
  `).join("");
}

export function buildFamilyMembersMarkup({ members = [], currentUserId = "", owner = false, renderAvatar }) {
  return members.map((member) => {
    const isCurrent = member.user_id === currentUserId;
    const canRemove = owner && member.role !== "owner";
    return `
      <article class="family-member">
        ${renderAvatar(member.user_id, "family-member-avatar")}
        <div>
          <strong>${escapeHtml(member.username)}${isCurrent ? "（我）" : ""}</strong>
          <small>${member.role === "owner" ? "家庭创建者" : "家庭成员"}</small>
        </div>
        ${canRemove ? `<button type="button" data-remove-family-member="${escapeHtml(member.user_id)}">移除</button>` : ""}
      </article>
    `;
  }).join("");
}

export function buildFamilyOutgoingInvitationsMarkup(invitations = []) {
  return invitations.map((invitation) => `
    <article class="family-invitation pending">
      <div><span>等待对方接受邀请</span><strong>${escapeHtml(invitation.invited_username)}</strong></div>
      <small>邀请已发送</small>
    </article>
  `).join("");
}

export function buildSettingsFamilyMarkup({
  signedIn = false,
  familyInfo = null,
  members = [],
  invitations = [],
  currentUserId = "",
  renderAvatar,
}) {
  if (!signedIn) return `<div class="settings-family-empty">登录后可以查看家庭成员。</div>`;
  const incoming = invitations.filter((invitation) => invitation.is_incoming);
  if (!familyInfo) {
    return `
      <div class="settings-family-empty">
        <strong>还没有加入家庭</strong>
        <p>创建家庭或接受邀请后，这里会直接显示家庭成员。</p>
      </div>
      ${incoming.map((invitation) => `
        <article class="settings-family-invite">
          <div><span>${escapeHtml(invitation.inviter_username)} 邀请你加入</span><strong>${escapeHtml(invitation.family_name)}</strong></div>
          <span>
            <button type="button" data-settings-family-response="${escapeHtml(invitation.invitation_id)}" data-accept="true">接受</button>
            <button type="button" data-settings-family-response="${escapeHtml(invitation.invitation_id)}" data-accept="false">拒绝</button>
          </span>
        </article>
      `).join("")}
    `;
  }
  const outgoing = invitations.filter((invitation) => !invitation.is_incoming);
  return `
    <div class="settings-family-summary">
      <span>当前家庭</span><strong>${escapeHtml(familyInfo.name || "我们的家")}</strong><small>${members.length} 位成员</small>
    </div>
    <div class="settings-family-members">
      ${members.map((member) => {
        const isCurrent = member.user_id === currentUserId;
        return `
          <article class="settings-family-member">
            ${renderAvatar(member.user_id, "family-member-avatar")}
            <div><strong>${escapeHtml(member.username)}${isCurrent ? "（我）" : ""}</strong><small>${member.role === "owner" ? "家庭创建者" : "家庭成员"}</small></div>
          </article>
        `;
      }).join("")}
    </div>
    ${familyInfo.isOwner ? `<div class="settings-family-invite-code">
      <div><span>注册邀请码</span><small>仅家庭创建者可见。可用它创建独立测试账号，测试完成后再删除。</small></div>
      <code data-settings-signup-invite-value hidden></code>
      <button type="button" data-settings-signup-invite>获取邀请码</button>
    </div>` : ""}
    ${outgoing.length ? `<div class="settings-family-pending">${outgoing.map((invitation) => `
      <article><span>邀请中</span><strong>${escapeHtml(invitation.invited_username)}</strong></article>
    `).join("")}</div>` : ""}
  `;
}
