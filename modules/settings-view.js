import { renderListIcon } from "./list-icons.js";
import { SETTINGS_SECTION_REGISTRY, getSettingsSection } from "./settings-section-registry.js";

function renderSettingsNavigation() {
  return SETTINGS_SECTION_REGISTRY.map(({ id, label, icon }, index) => `
    <button id="settings-tab-${id}" type="button" data-settings-section="${id}" role="tab" aria-controls="${id}" aria-selected="${String(index === 0)}" tabindex="${index === 0 ? "0" : "-1"}">
      <span class="settings-nav-icon">${renderListIcon(icon)}</span><span>${label}</span>
    </button>
  `).join("");
}

function renderSettingsGroups() {
  return `
    <section class="settings-group" id="settingsAppearance" role="tabpanel" aria-labelledby="settings-tab-settingsAppearance">
      <p class="kicker">Appearance</p>
      <h3>外观与使用</h3>
      <button id="renameHomeButton" type="button"><span>主页名称</span><strong><em id="settingsHomeNameValue">咻蛋之家</em><small>点击修改</small></strong></button>
      <button id="settingsFeedLayoutButton" type="button"><span>手机列表布局</span><strong><em id="settingsFeedLayoutValue">双列</em><small>点击切换单列/双列</small></strong></button>
      <div class="settings-inline-control"><span>文字大小</span><div class="text-scale-options" role="group" aria-label="文字大小"><button type="button" data-text-scale="standard">标准</button><button type="button" data-text-scale="large">较大</button><button type="button" data-text-scale="xlarge">特大</button></div></div>
      <div class="settings-install-card"><div><span>安装应用</span><small id="installAppHint" hidden></small></div><button class="primary" id="installAppButton" type="button" hidden>安装到主屏幕</button></div>
    </section>

    <section class="settings-group" id="settingsAccount" role="tabpanel" aria-labelledby="settings-tab-settingsAccount" hidden>
      <p class="kicker">Account & Security</p><h3>账户与安全</h3>
      <div class="settings-account-overview"></div>
      <button id="renameProfileButton" type="button"><span>昵称</span><strong><em id="settingsNicknameValue">User</em><small>点击修改</small></strong></button>
      <button id="changeAvatarButton" type="button"><span>头像</span><strong><em id="settingsAvatarValue">文字头像</em><small>点击更换</small></strong></button>
      <button id="changePasswordButton" type="button"><span>修改密码</span><strong>更新当前登录密码</strong></button>
      <button id="recoveryKeyButton" type="button"><span>恢复密钥</span><strong>忘记密码时用来重设</strong></button>
      <button id="changeSecretPinButton" type="button"><span>秘藏密码</span><strong>修改进入秘藏的四位数字密码</strong></button>
      <button id="bindEmailButton" type="button"><span>绑定邮箱</span><strong><em id="settingsEmailValue">未绑定</em><small>用于找回用户名和密码</small></strong></button>
    </section>

    <section class="settings-group" id="settingsFamily" role="tabpanel" aria-labelledby="settings-tab-settingsFamily" hidden>
      <p class="kicker">Family & Sharing</p><h3>家庭与共享</h3>
      <div class="settings-family-panel" id="settingsFamilyPanel"></div>
      <button id="familyTaglineButton" type="button"><span>家庭签名</span><strong><em id="settingsFamilyTaglineValue"></em><small>所有家庭成员共享可见</small></strong></button>
      <button id="familyAccountButton" type="button"><span>管理家庭</span><strong>创建家庭、邀请成员或处理邀请</strong></button>
    </section>

    <section class="settings-group" id="settingsTools" role="tabpanel" aria-labelledby="settings-tab-settingsTools" hidden>
      <p class="kicker">Notifications & Tools</p><h3>通知与工具</h3>
      <div class="settings-tool-order" id="settingsToolOrderList"></div>
      <section class="settings-secondary-card settings-notification-group" id="settingsNotifications">
        <p class="kicker">Web Push</p><h4>消息通知</h4>
        <div class="push-settings-card"><div><span>这台设备</span><strong id="pushNotificationState">检查中</strong><small id="pushNotificationDetail">正在读取通知状态...</small></div><div class="push-settings-actions"><button class="primary" id="enablePushNotifications" type="button">开启通知</button><button id="disablePushNotifications" type="button" hidden>关闭这台设备</button></div></div>
        <p class="status-line" id="pushNotificationStatus"></p>
      </section>
    </section>

    <section class="settings-group" id="settingsStorage" role="tabpanel" aria-labelledby="settings-tab-settingsStorage" hidden>
      <p class="kicker">Storage & Data</p><h3>存储与数据</h3>
      <button id="refreshCacheInfoButton" type="button"><span>缓存占用</span><strong><em id="settingsCacheValue">计算中</em><small>点击刷新缓存大小</small></strong></button>
      <button id="cacheLimitButton" type="button"><span>缓存上限</span><strong><em id="settingsCacheLimitValue">日记 100 MB · 秘藏 300 MB</em><small>日记和秘藏按容量自动淘汰旧图片</small></strong></button>
      <button id="mediaCachePolicyButton" type="button"><span>自动缓存</span><strong><em>读取中</em><small>只在明确允许时保留近期媒体</small></strong></button>
      <button id="downloadDiaryOfflineButton" type="button"><span>下载日记离线包</span><strong>手动缓存当前日记文字和图片</strong></button>
      <button id="downloadSecretOfflineButton" type="button"><span>下载全部秘藏离线包</span><strong>缓存全部秘藏相册和图片，直到达到容量上限</strong></button>
      <button id="clearDiaryCacheButton" type="button"><span>清除日记缓存</span><strong>只清除日记文字与图片</strong></button>
      <button id="clearSecretCacheButton" type="button"><span>清除秘藏缓存</span><strong>只清除秘藏相册与图片</strong></button>
      <button id="clearAppCacheButton" type="button"><span>清除全部离线内容</span><strong><em id="settingsCacheStatus">保留账号和设置</em><small>清除日记缓存和离线资源</small></strong></button>

      <section class="settings-secondary-card settings-performance-card"><div><p class="kicker">Performance</p><h4>性能诊断</h4><small data-performance-summary>正在准备本机摘要…</small></div><div><button type="button" data-performance-copy>复制诊断信息</button><button type="button" data-performance-clear>清除记录</button></div></section>

      <section class="settings-secondary-card settings-safety" id="settingsSafety">
        <p class="kicker">Backup & Recycle Bin</p><h4>备份与回收站</h4>
        <div class="trash-head"><div><strong>每日云端备份</strong><small>每天凌晨 03:20（日本时间）生成 1 份，自动保留最近 7 天</small><em id="latestBackupStatus">正在读取最近备份…</em></div><div class="backup-head-actions"><button type="button" data-refresh-backups aria-label="刷新备份">${renderListIcon("refresh")}</button><button type="button" data-create-backup>立即备份</button></div></div>
        <div class="cloud-backup-list" id="cloudBackupList"></div>
        <button id="backfillThumbnailsButton" type="button"><span>优化旧图片</span><strong>每次为最多 20 张旧图生成列表缩略图</strong></button>
        <div class="trash-head"><div><strong>最近删除</strong><small>日记、秘藏、菜谱、心愿、周末计划、纪念日和留言保留 30 天</small></div><button type="button" data-refresh-trash aria-label="刷新回收站">${renderListIcon("refresh")}</button></div>
        <div class="trash-items" id="trashItemsList"></div>
      </section>

      <section class="settings-secondary-card" id="settingsDiagnostics"><p class="kicker">Diagnostics</p><h4>离线与运行诊断</h4><p>检查当前设备是否真的可以离线启动，以及日记和秘藏图片的实际缓存命中情况。</p><button type="button" data-run-diagnostics><span>开始诊断</span><strong>不会上传任何设备信息</strong></button><div class="diagnostic-results" id="diagnosticResults"></div></section>
      <section class="settings-secondary-card" id="settingsUploads"><p class="kicker">Transfers</p><h4>上传任务中心</h4><div class="upload-center-head"><strong id="uploadCenterStatus">正在读取…</strong><button type="button" data-retry-uploads>立即重试</button></div><div class="upload-center-list" id="uploadCenterList"></div></section>
    </section>
  `;
}

export function renderSettingsShell(root) {
  if (!root) return;
  const nav = root.querySelector("[data-settings-nav]");
  const content = root.querySelector("[data-settings-content]");
  if (!nav || !content) return;
  nav.innerHTML = renderSettingsNavigation();
  content.innerHTML = `<div class="settings-mobile-header" data-settings-mobile-header hidden><button type="button" data-settings-back aria-label="返回设置分类">${renderListIcon("back")}<span>设置分类</span></button><h3 data-settings-mobile-title>外观与使用</h3></div>${renderSettingsGroups()}`;
  root.dataset.settingsViewReady = "true";
  applySettingsNavigationSemantics(root, SETTINGS_SECTION_REGISTRY[0].id);
}

export function applySettingsNavigationSemantics(root, activeSection = "") {
  const mobile = root?.ownerDocument?.defaultView?.matchMedia?.("(max-width: 700px)").matches || false;
  const tabs = [...(root?.querySelectorAll("[data-settings-section]") || [])];
  const selectedSection = activeSection
    || tabs.find((button) => button.classList.contains("active"))?.dataset.settingsSection
    || tabs.find((button) => button.getAttribute("aria-selected") === "true")?.dataset.settingsSection
    || tabs[0]?.dataset.settingsSection
    || "";
  const settingsNav = root?.querySelector("[data-settings-nav]");
  if (settingsNav) {
    if (mobile) settingsNav.removeAttribute("role");
    else settingsNav.setAttribute("role", "tablist");
  }
  tabs.forEach((button) => {
    const sectionId = button.dataset.settingsSection;
    if (!button.id) button.id = `settings-tab-${sectionId}`;
    if (mobile) {
      button.removeAttribute("role");
      button.removeAttribute("aria-controls");
      button.removeAttribute("aria-selected");
      button.removeAttribute("tabindex");
    } else {
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", sectionId);
      button.tabIndex = sectionId === selectedSection ? 0 : -1;
      button.setAttribute("aria-selected", String(sectionId === selectedSection));
    }
    button.classList.toggle("active", sectionId === selectedSection);
  });
  return { mobile, selectedSection };
}

export function showMobileSettingsSection(root, sectionId) {
  const section = getSettingsSection(sectionId);
  if (!root || !section) return;
  const sidebar = root.querySelector(".settings-sidebar");
  if (sidebar) root.dataset.settingsSidebarScroll = String(sidebar.scrollTop || 0);
  root.dataset.mobileSettingsSection = section.id;
  const header = root.querySelector("[data-settings-mobile-header]");
  const title = root.querySelector("[data-settings-mobile-title]");
  if (header) header.hidden = false;
  if (title) title.textContent = section.label;
}

export function hideMobileSettingsSection(root) {
  if (!root) return;
  const activeId = root.dataset.mobileSettingsSection || "";
  const sidebar = root.querySelector(".settings-sidebar");
  delete root.dataset.mobileSettingsSection;
  root.querySelector("[data-settings-mobile-header]")?.setAttribute("hidden", "");
  if (sidebar) sidebar.scrollTop = Number(root.dataset.settingsSidebarScroll || 0);
  const target = [...root.querySelectorAll("[data-settings-section]")]
    .find((button) => button.dataset.settingsSection === activeId);
  target?.focus({ preventScroll: true });
}
