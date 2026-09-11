import { createAuthView } from "./auth-view.js";

function passwordsMatch(password, confirmation, statusElement) {
  if (password.length < 6) {
    statusElement.textContent = "密码至少需要 6 位。";
    return false;
  }
  if (password !== confirmation) {
    statusElement.textContent = "两次输入的密码不一致。";
    return false;
  }
  return true;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());
}

function getSessionResultHint(result, successText) {
  if (result?.error) return result.error.message;
  if (result?.backup?.persisted === false) {
    const detail = result.backup.error?.message ? `：${result.backup.error.message}` : "。";
    return `${successText}，但本地会话备份不可用${detail}`;
  }
  return `${successText}。`;
}

export function createAuthController({
  elements,
  endpoint,
  getDatabase,
  getSession,
  usernameToEmail,
  getRedirectUrl,
  setHint,
  getBoundEmail,
  renderSettingsSummary,
  isMissingCloudSchema,
  closeMobileDiaryPage,
  clearSecretUnlockState,
}) {
  const authView = createAuthView({ elements });

  async function login() {
    const database = getDatabase();
    if (!database) {
      setHint("Cloudflare 服务正在初始化，请稍后再试。");
      return;
    }
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value;
    const email = usernameToEmail(username);
    authView.setFieldValidity({ username: !email, password: !password });
    if (!email || !password) {
      setHint("请输入用户名和密码。");
      return;
    }
    setHint("正在登录...");
    try {
      const result = await database.auth.signInWithPassword({ email, password });
      setHint(getSessionResultHint(result, "登录成功"));
    } catch (error) {
      setHint(`登录失败：${error.message || "网络或配置错误"}`);
    }
  }

  async function verifyInviteCode(inviteCode) {
    let response;
    try {
      response = await fetch(`${endpoint.replace(/\/+$/, "")}/api/invite/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode }),
      });
    } catch (error) {
      throw new Error(`邀请码校验失败：${error.message || "无法连接服务"}`);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "邀请码不正确。");
  }

  async function signup() {
    const database = getDatabase();
    if (!database) {
      setHint("Cloudflare 服务正在初始化，请稍后再试。");
      return;
    }
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value;
    const inviteCode = elements.inviteCodeInput?.value.trim() || "";
    const email = usernameToEmail(username);
    authView.setFieldValidity({ username: !email, password: !password });
    if (!email || !password) {
      setHint("请输入用户名和密码。用户名只能用中文、英文、数字、下划线或短横线。");
      return;
    }
    if (password.length < 6) {
      authView.setFieldValidity({ password: true });
      setHint("密码至少需要 6 位。");
      return;
    }
    if (!inviteCode) {
      authView.setFieldValidity({ inviteCode: true });
      setHint("注册需要邀请码，请找 xiudan320 获取。");
      elements.inviteCodeInput?.focus();
      return;
    }
    authView.setFieldValidity();
    setHint("正在校验邀请码...");
    try {
      await verifyInviteCode(inviteCode);
      setHint("邀请码通过，正在注册...");
      const result = await database.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
          data: { username, inviteCode },
        },
      });
      setHint(getSessionResultHint(result, "注册完成，可以直接登录"));
    } catch (error) {
      setHint(`注册失败：${error.message || "网络或配置错误"}`);
    }
  }

  async function logout() {
    const database = getDatabase();
    if (!database) return;
    closeMobileDiaryPage();
    clearSecretUnlockState();
    elements.secretPinDialog?.close();
    try {
      const result = await database.auth.signOut();
      if (!result?.localCleared) {
        setHint(result?.serverRevoked === false
          ? "已退出当前界面，但本地会话清理和服务器撤销都未完成，请刷新重试。"
          : "服务器会话已撤销，但本地会话清理未完成，请刷新重试。");
      } else if (result?.serverRevoked === false) {
        setHint("已在本机退出，服务器会话撤销未确认。");
      } else {
        setHint("已退出登录");
      }
    } catch (error) {
      setHint(`退出登录失败：${error.message || "本地会话清理未完成"}`);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const database = getDatabase();
    if (!database || !getSession()) return;
    const password = elements.newPasswordInput.value;
    if (!passwordsMatch(password, elements.confirmPasswordInput.value, elements.changePasswordStatus)) return;
    elements.changePasswordStatus.textContent = "正在修改密码…";
    const { error } = await database.auth.updateUser({ password });
    if (error) {
      elements.changePasswordStatus.textContent = `修改失败：${error.message}`;
      return;
    }
    elements.changePasswordForm.reset();
    elements.changePasswordStatus.textContent = "密码已修改。";
    window.setTimeout(() => elements.changePasswordDialog.close(), 650);
  }

  async function saveRecoveryKey(event) {
    event.preventDefault();
    const database = getDatabase();
    if (!database || !getSession()) return;
    const recoveryKey = elements.recoveryKeyInput.value.trim();
    if (recoveryKey.length < 12) {
      elements.recoveryKeyStatus.textContent = "恢复密钥至少需要 12 位。";
      return;
    }
    if (recoveryKey !== elements.confirmRecoveryKeyInput.value.trim()) {
      elements.recoveryKeyStatus.textContent = "两次输入的恢复密钥不一致。";
      return;
    }
    elements.recoveryKeyStatus.textContent = "正在保存恢复密钥…";
    const { error } = await database.rpc("set_password_recovery_key", {
      p_recovery_key: recoveryKey,
    });
    if (error) {
      elements.recoveryKeyStatus.textContent = isMissingCloudSchema(error)
        ? "恢复功能尚未初始化，请先部署最新版 Cloudflare D1 结构。"
        : `保存失败：${error.message}`;
      return;
    }
    elements.recoveryKeyForm.reset();
    elements.recoveryKeyStatus.textContent = "恢复密钥已加密保存，请妥善保管。";
    window.setTimeout(() => elements.recoveryKeyDialog.close(), 900);
  }

  function resetEmailBindingDialog() {
    if (!elements.emailBindingDialog) return;
    elements.emailBindingRequestForm?.reset();
    elements.emailBindingConfirmForm?.reset();
    if (elements.accountEmailInput) {
      elements.accountEmailInput.value = getBoundEmail();
      elements.accountEmailInput.disabled = false;
    }
    if (elements.emailBindingConfirmForm) elements.emailBindingConfirmForm.hidden = true;
    if (elements.emailBindingStatus) elements.emailBindingStatus.textContent = "";
    if (elements.emailBindingConfirmStatus) elements.emailBindingConfirmStatus.textContent = "";
  }

  async function requestEmailBinding(event) {
    event.preventDefault();
    const database = getDatabase();
    if (!database?.account || !getSession()) return;
    const email = String(elements.accountEmailInput?.value || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      if (elements.emailBindingStatus) elements.emailBindingStatus.textContent = "请输入有效的邮箱地址。";
      return;
    }
    if (elements.requestEmailBindingButton) elements.requestEmailBindingButton.disabled = true;
    if (elements.emailBindingStatus) elements.emailBindingStatus.textContent = "正在发送验证码…";
    const { error } = await database.account.requestEmailBind(email);
    if (error) {
      if (elements.emailBindingStatus) elements.emailBindingStatus.textContent = `发送失败：${error.message}`;
      if (elements.requestEmailBindingButton) elements.requestEmailBindingButton.disabled = false;
      return;
    }
    if (elements.accountEmailInput) elements.accountEmailInput.disabled = true;
    if (elements.emailBindingConfirmForm) elements.emailBindingConfirmForm.hidden = false;
    if (elements.emailBindingStatus) elements.emailBindingStatus.textContent = "验证码已发送，10 分钟内有效。";
    elements.accountEmailCodeInput?.focus();
    if (elements.requestEmailBindingButton) elements.requestEmailBindingButton.disabled = false;
  }

  async function confirmEmailBinding(event) {
    event.preventDefault();
    const database = getDatabase();
    const session = getSession();
    if (!database?.account || !session) return;
    const email = String(elements.accountEmailInput?.value || "").trim().toLowerCase();
    const code = String(elements.accountEmailCodeInput?.value || "").trim();
    if (!/^\d{6}$/.test(code)) {
      if (elements.emailBindingConfirmStatus) elements.emailBindingConfirmStatus.textContent = "请输入 6 位验证码。";
      return;
    }
    if (elements.emailBindingConfirmStatus) elements.emailBindingConfirmStatus.textContent = "正在验证…";
    const { data, error } = await database.account.confirmEmailBind(email, code);
    if (error) {
      if (elements.emailBindingConfirmStatus) elements.emailBindingConfirmStatus.textContent = `绑定失败：${error.message}`;
      return;
    }
    const savedEmail = String(data?.email || email).trim().toLowerCase();
    const { error: sessionError } = await database.auth.updateUser({
      data: { bound_email: savedEmail },
    });
    if (sessionError) {
      if (elements.emailBindingConfirmStatus) elements.emailBindingConfirmStatus.textContent = `本地同步失败：${sessionError.message}`;
      return;
    }
    session.user.email = savedEmail;
    session.user.user_metadata = {
      ...(session.user.user_metadata || {}),
      bound_email: savedEmail,
    };
    if (elements.emailBindingConfirmStatus) elements.emailBindingConfirmStatus.textContent = "邮箱已绑定，可用于找回用户名和密码。";
    renderSettingsSummary();
    window.setTimeout(() => elements.emailBindingDialog?.close(), 900);
  }

  function resetEmailRecoveryUi() {
    elements.emailResetRequestForm?.reset();
    elements.emailResetConfirmForm?.reset();
    if (elements.emailResetConfirmForm) elements.emailResetConfirmForm.hidden = true;
    if (elements.resetEmailInput) elements.resetEmailInput.disabled = false;
    if (elements.emailResetStatus) elements.emailResetStatus.textContent = "";
  }

  async function requestEmailPasswordReset(event) {
    event.preventDefault();
    const database = getDatabase();
    if (!database?.account) return;
    const email = String(elements.resetEmailInput?.value || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      if (elements.emailResetStatus) elements.emailResetStatus.textContent = "请输入有效的绑定邮箱。";
      return;
    }
    if (elements.emailResetStatus) elements.emailResetStatus.textContent = "正在发送验证码…";
    const { error } = await database.account.requestPasswordReset(email);
    if (error) {
      if (elements.emailResetStatus) elements.emailResetStatus.textContent = `发送失败：${error.message}`;
      return;
    }
    if (elements.resetEmailInput) elements.resetEmailInput.disabled = true;
    if (elements.emailResetConfirmForm) elements.emailResetConfirmForm.hidden = false;
    if (elements.emailResetStatus) elements.emailResetStatus.textContent = "验证码已发送，邮件中也会告诉你用户名。";
    elements.resetEmailCodeInput?.focus();
  }

  async function confirmEmailPasswordReset(event) {
    event.preventDefault();
    const database = getDatabase();
    if (!database?.account) return;
    const email = String(elements.resetEmailInput?.value || "").trim().toLowerCase();
    const code = String(elements.resetEmailCodeInput?.value || "").trim();
    const password = elements.emailResetNewPasswordInput?.value || "";
    const confirmation = elements.emailResetConfirmPasswordInput?.value || "";
    if (!/^\d{6}$/.test(code)) {
      if (elements.emailResetStatus) elements.emailResetStatus.textContent = "请输入 6 位验证码。";
      return;
    }
    if (!passwordsMatch(password, confirmation, elements.emailResetStatus)) return;
    if (elements.emailResetStatus) elements.emailResetStatus.textContent = "正在重设密码…";
    const { data, error } = await database.account.confirmPasswordReset(email, code, password);
    if (error) {
      if (elements.emailResetStatus) elements.emailResetStatus.textContent = `重设失败：${error.message}`;
      return;
    }
    if (data?.username) elements.usernameInput.value = data.username;
    elements.passwordInput.value = "";
    if (elements.emailResetStatus) elements.emailResetStatus.textContent = "密码已重设，请使用邮件中的用户名登录。";
    window.setTimeout(() => elements.forgotPasswordDialog?.close(), 1000);
  }

  async function resetForgottenPassword(event) {
    event.preventDefault();
    const database = getDatabase();
    if (!database) return;
    const username = elements.recoveryUsernameInput.value.trim();
    const recoveryKey = elements.recoverySecretInput.value.trim();
    const password = elements.recoveryNewPasswordInput.value;
    if (!username || recoveryKey.length < 12) {
      elements.forgotPasswordStatus.textContent = "请输入用户名和至少 12 位的恢复密钥。";
      return;
    }
    if (!passwordsMatch(password, elements.recoveryConfirmPasswordInput.value, elements.forgotPasswordStatus)) return;
    elements.forgotPasswordStatus.textContent = "正在验证恢复密钥…";
    const { data, error } = await database.rpc("reset_password_with_recovery_key", {
      p_username: username,
      p_recovery_key: recoveryKey,
      p_new_password: password,
    });
    if (error) {
      elements.forgotPasswordStatus.textContent = isMissingCloudSchema(error)
        ? "恢复功能尚未初始化，请先部署最新版 Cloudflare D1 结构。"
        : `重设失败：${error.message}`;
      return;
    }
    if (!data) {
      elements.forgotPasswordStatus.textContent = "用户名或恢复密钥不正确。";
      return;
    }
    elements.forgotPasswordForm.reset();
    elements.usernameInput.value = username;
    elements.passwordInput.value = "";
    elements.forgotPasswordStatus.textContent = "密码已重设，可以使用新密码登录。";
    window.setTimeout(() => elements.forgotPasswordDialog.close(), 1000);
  }

  return {
    changePassword,
    confirmEmailBinding,
    confirmEmailPasswordReset,
    login,
    logout,
    requestEmailBinding,
    requestEmailPasswordReset,
    resetEmailBindingDialog,
    resetEmailRecoveryUi,
    resetForgottenPassword,
    resetUi: authView.reset,
    saveRecoveryKey,
    setAuthFieldValidity: authView.setFieldValidity,
    setMode: authView.setMode,
    signup,
    togglePasswordVisibility: authView.togglePasswordVisibility,
  };
}
