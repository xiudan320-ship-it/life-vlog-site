const AUTH_MODES = new Set(["login", "signup"]);
const AUTH_FIELD_KEYS = {
  username: "usernameInput",
  password: "passwordInput",
  inviteCode: "inviteCodeInput",
};

export function createAuthView({ elements } = {}) {
  let mode = "login";
  let passwordVisible = false;

  function syncPasswordVisibility() {
    const input = elements.passwordInput;
    const toggle = elements.passwordToggle;
    if (!input || !toggle) return;

    input.type = passwordVisible ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(passwordVisible));
    toggle.setAttribute("aria-label", passwordVisible ? "隐藏密码" : "显示密码");
    toggle.title = passwordVisible ? "隐藏密码" : "显示密码";
    toggle.querySelector('[data-password-icon="show"]')?.toggleAttribute("hidden", passwordVisible);
    toggle.querySelector('[data-password-icon="hide"]')?.toggleAttribute("hidden", !passwordVisible);
  }

  function syncFieldValidity(fields = {}) {
    for (const [fieldName, elementKey] of Object.entries(AUTH_FIELD_KEYS)) {
      const field = elements[elementKey];
      if (!field) continue;
      if (fields[fieldName]) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
    }
  }

  function syncMode({ announce = true } = {}) {
    const isSignup = mode === "signup";
    if (elements.authCard) elements.authCard.dataset.authMode = mode;
    if (elements.inviteCodeField) elements.inviteCodeField.hidden = !isSignup;
    if (elements.loginButton) elements.loginButton.hidden = isSignup;
    if (elements.signupButton) elements.signupButton.hidden = !isSignup;
    if (elements.forgotPasswordButton) elements.forgotPasswordButton.hidden = isSignup;
    if (elements.authModeToggle) {
      elements.authModeToggle.textContent = isSignup ? "返回登录" : "注册账户";
      elements.authModeToggle.setAttribute("aria-expanded", String(isSignup));
    }
    if (elements.authModeDescription) {
      elements.authModeDescription.textContent = isSignup
        ? "新账号需要邀请码。"
        : "已有账号直接登录，还没有账号时再注册。";
    }
    if (elements.passwordInput) {
      elements.passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
    }
    if (announce && elements.authHint) {
      elements.authHint.textContent = isSignup
        ? "填写用户名、密码和邀请码注册。"
        : "输入用户名和密码登录。";
    }
    syncPasswordVisibility();
  }

  function setMode(nextMode) {
    const requestedMode = AUTH_MODES.has(nextMode)
      ? nextMode
      : mode === "login"
        ? "signup"
        : "login";
    mode = requestedMode;
    syncFieldValidity();
    syncMode();
  }

  function togglePasswordVisibility() {
    passwordVisible = !passwordVisible;
    syncPasswordVisibility();
  }

  function reset() {
    mode = "login";
    passwordVisible = false;
    syncFieldValidity();
    syncMode({ announce: false });
  }

  for (const elementKey of Object.values(AUTH_FIELD_KEYS)) {
    elements[elementKey]?.addEventListener("input", (event) => {
      event.currentTarget.removeAttribute("aria-invalid");
    });
  }

  reset();

  return {
    getMode: () => mode,
    reset,
    setFieldValidity: syncFieldValidity,
    setMode,
    togglePasswordVisibility,
  };
}
