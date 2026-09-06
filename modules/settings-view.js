import { renderListIcon } from "./list-icons.js";

function renderSettingsGroups() {
  return `
    <section class="settings-group" id="settingsAppearance" role="tabpanel" aria-labelledby="settings-tab-settingsAppearance">
      <header class="settings-group-header"><h3>外观与使用</h3><p>调整主页、列表和设置中心的显示方式。</p></header>
      <div class="settings-section-card">
        <button id="renameHomeButton" type="button" class="settings-row settings-row-nav"><span>主页名称</span><strong><em id="settingsHomeNameValue">咻蛋之家</em><small>点击修改</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="settingsFeedLayoutButton" type="button" class="settings-row settings-row-nav"><span>手机列表布局</span><strong><em id="settingsFeedLayoutValue">双列</em><small>点击切换单列/双列</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <div class="settings-row settings-row-static" id="settingsTextScale"><span>文字大小</span><div class="text-scale-options" role="group" aria-label="文字大小"><button type="button" data-text-scale="standard">标准</button><button type="button" data-text-scale="large">较大</button><button type="button" data-text-scale="xlarge">特大</button></div></div>
        <div class="settings-row settings-row-static settings-install-card" id="settingsInstallApp"><div><span>安装应用</span><small id="installAppHint" hidden></small></div><button class="primary" id="installAppButton" type="button" hidden>安装到主屏幕</button></div>
      </div>
      <section class="settings-section-card settings-primary-navigation" id="settingsPrimaryNavigation" aria-labelledby="settingsPrimaryNavigationTitle">
        <header class="settings-card-header"><div><h4 id="settingsPrimaryNavigationTitle">顶部分页</h4><p>选择要显示的入口，并用上移/下移调整顺序。最多显示 5 个入口；日记始终保留，VLOG 是日记的视频模式。</p></div></header>
        <div class="settings-primary-navigation-list" data-primary-navigation-settings-list></div>
        <p class="status-line" data-primary-navigation-status role="status" aria-live="polite"></p>
      </section>
    </section>

    <section class="settings-group" id="settingsAccount" role="tabpanel" aria-labelledby="settings-tab-settingsAccount" hidden>
      <header class="settings-group-header"><h3>账户与安全</h3><p>管理个人资料、登录方式和秘藏访问权限。</p></header>
      <div class="settings-account-overview"></div>
      <div class="settings-section-card">
        <button id="renameProfileButton" type="button" class="settings-row settings-row-nav"><span>昵称</span><strong><em id="settingsNicknameValue">User</em><small>点击修改</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="changeAvatarButton" type="button" class="settings-row settings-row-nav"><span>头像</span><strong><em id="settingsAvatarValue">文字头像</em><small>点击更换</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="changePasswordButton" type="button" class="settings-row settings-row-nav"><span>修改密码</span><strong>更新当前登录密码</strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="recoveryKeyButton" type="button" class="settings-row settings-row-nav"><span>恢复密钥</span><strong>忘记密码时用来重设</strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="changeSecretPinButton" type="button" class="settings-row settings-row-nav"><span>秘藏密码</span><strong>修改进入秘藏的四位数字密码</strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="bindEmailButton" type="button" class="settings-row settings-row-nav"><span>绑定邮箱</span><strong><em id="settingsEmailValue">未绑定</em><small>用于找回用户名和密码</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
      </div>
    </section>

    <section class="settings-group" id="settingsFamily" role="tabpanel" aria-labelledby="settings-tab-settingsFamily" hidden>
      <header class="settings-group-header"><h3>家庭与共享</h3><p>邀请家人、共享回忆、管理成员。</p></header>
      <div class="settings-family-panel" id="settingsFamilyPanel"></div>
      <div class="settings-section-card">
        <button id="familyTaglineButton" type="button" class="settings-row settings-row-nav"><span>家庭签名</span><strong><em id="settingsFamilyTaglineValue"></em><small>所有家庭成员共享可见</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="familyAccountButton" type="button" class="settings-row settings-row-nav"><span>管理家庭</span><strong>创建家庭、邀请成员或处理邀请</strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
      </div>
    </section>

    <section class="settings-group" id="settingsTools" role="tabpanel" aria-labelledby="settings-tab-settingsTools" hidden>
      <header class="settings-group-header"><h3>通知与工具</h3><p>推送提醒与首页工具入口的排序。</p></header>
      <section class="settings-section-card settings-notification-group" id="settingsNotifications" aria-labelledby="settingsNotificationsTitle">
        <header class="settings-card-header"><div><h4 id="settingsNotificationsTitle">消息通知</h4><p>管理这台设备收到家庭新消息的方式。</p></div></header>
        <div class="push-settings-card"><div><span>这台设备</span><strong id="pushNotificationState">检查中</strong><small id="pushNotificationDetail">正在读取通知状态...</small></div><div class="push-settings-actions"><button class="primary" id="enablePushNotifications" type="button">开启通知</button><button id="disablePushNotifications" type="button" hidden>关闭这台设备</button></div></div>
        <p class="status-line" id="pushNotificationStatus" role="status" aria-live="polite"></p>
      </section>
      <section class="settings-section-card settings-tool-order-panel" id="settingsToolOrderPanel" aria-labelledby="settingsToolOrderTitle">
        <header class="settings-card-header"><div><h4 id="settingsToolOrderTitle">工具排序</h4><p>决定首页工具入口的先后顺序。</p></div></header>
        <div id="settingsToolOrderList"></div>
      </section>
    </section>

    <section class="settings-group" id="settingsStorage" role="tabpanel" aria-labelledby="settings-tab-settingsStorage" hidden>
      <header class="settings-group-header"><h3>存储与数据</h3><p>缓存、备份、上传任务与诊断。</p></header>
      <section class="settings-section-card" aria-labelledby="settingsCacheTitle">
        <header class="settings-card-header"><div><h4 id="settingsCacheTitle">本地缓存</h4><p>只影响这台设备，不会删除云端原图。</p></div></header>
        <button id="refreshCacheInfoButton" type="button" class="settings-row settings-row-nav"><span>缓存占用</span><strong><em id="settingsCacheValue">计算中</em><small>点击刷新缓存大小</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="cacheLimitButton" type="button" class="settings-row settings-row-nav"><span>缓存容量上限</span><strong><em id="settingsCacheLimitValue">日记 100 MB · 秘藏 300 MB</em><small>日记和秘藏分别按容量自动淘汰旧图片</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="mediaCachePolicyButton" type="button" class="settings-row settings-row-nav" aria-pressed="false"><span>自动缓存</span><strong><em>读取中</em><small>只在明确允许时保留近期媒体</small></strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="downloadDiaryOfflineButton" type="button" class="settings-row settings-row-nav"><span>下载日记离线包</span><strong>手动缓存当前日记文字和图片</strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <button id="downloadSecretOfflineButton" type="button" class="settings-row settings-row-nav"><span>下载秘藏离线包</span><strong>手动缓存秘藏相册和图片，直到达到容量上限</strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <details class="settings-danger-zone"><summary>清除缓存</summary><div class="settings-danger-actions"><button type="button" id="clearDiaryCacheButton" class="settings-btn-danger">清除日记缓存</button><button type="button" id="clearSecretCacheButton" class="settings-btn-danger">清除秘藏缓存</button><button type="button" id="clearAppCacheButton" class="settings-btn-danger">清除全部离线内容</button></div></details>
      </section>

      <section class="settings-section-card settings-performance-card" id="settingsPerformance" aria-labelledby="settingsPerformanceTitle"><header class="settings-card-header"><div><h4 id="settingsPerformanceTitle">性能诊断</h4><p data-performance-summary>正在准备本机摘要…</p></div><div class="settings-card-actions"><button type="button" data-performance-copy>复制诊断信息</button><button type="button" data-performance-clear>清除记录</button></div></header></section>

      <section class="settings-section-card settings-safety" id="settingsSafety" aria-labelledby="settingsSafetyTitle"><header class="settings-card-header"><div><h4 id="settingsSafetyTitle">备份与回收站</h4><p>备份家庭数据，或处理最近删除的内容。</p></div></header>
        <div class="trash-head"><div><strong>每日云端备份</strong><small>每天凌晨 03:20（日本时间）生成 1 份，自动保留最近 7 天</small><em id="latestBackupStatus">正在读取最近备份…</em></div><div class="backup-head-actions"><button type="button" data-refresh-backups aria-label="刷新备份">${renderListIcon("refresh")}</button><button type="button" data-create-backup>立即备份</button></div></div>
        <div class="cloud-backup-list" id="cloudBackupList"></div>
        <button id="backfillThumbnailsButton" type="button" class="settings-row settings-row-nav"><span>优化旧图片</span><strong>每次为最多 20 张旧图生成列表缩略图</strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>
        <div class="trash-head"><div><strong>最近删除</strong><small>日记、秘藏、菜谱、心愿、周末计划、纪念日和留言保留 30 天</small></div><button type="button" data-refresh-trash aria-label="刷新回收站">${renderListIcon("refresh")}</button></div>
        <div class="trash-items" id="trashItemsList"></div>
      </section>

      <section class="settings-section-card" id="settingsDiagnostics" aria-labelledby="settingsDiagnosticsTitle"><header class="settings-card-header"><div><h4 id="settingsDiagnosticsTitle">离线与运行诊断</h4><p>检查应用、网络和本机缓存的实际状态。</p></div></header><button type="button" data-run-diagnostics class="settings-row settings-row-nav"><span>开始诊断</span><strong>不会上传任何设备信息</strong><svg class="icon settings-row-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button><div class="diagnostic-results" id="diagnosticResults"></div></section>
      <section class="settings-section-card" id="settingsUploads" aria-labelledby="settingsUploadsTitle"><header class="settings-card-header"><div><h4 id="settingsUploadsTitle">上传任务中心</h4><p>弱网或断网发布时，等待中的任务会显示在这里。</p></div><div class="upload-center-head"><strong id="uploadCenterStatus">正在读取…</strong><button type="button" data-retry-uploads>立即重试</button></div></header><div class="upload-center-list" id="uploadCenterList"></div></section>
    </section>
  `;
}

export function renderSettingsSections(root) {
  const content = root?.querySelector?.("[data-settings-content]") || root;
  if (!content || content.querySelector(".settings-group")) return false;
  content.innerHTML = renderSettingsGroups();
  return true;
}
