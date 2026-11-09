import { element } from "./visual-ui.js";

function recoveryButton(status) {
  const conflict = status === 409;
  const recover = element("button", conflict ? "重载云存档" : "返回登录", "monster-image-button"); recover.type = "button";
  recover.onclick = () => { if (conflict) location.reload(); else location.href = "/"; };
  return recover;
}
function recoveryMessage(message, status) {
  return `${message}${status === 409 ? " · 云档已有更新，请重载云存档" : " · 登录已过期，请返回登录"}`;
}

export function renderSaveFeedback({ content, receipt, actions }) {
  const status = element("p", receipt.message, "monster-upgrade-receipt"); status.setAttribute("role", "status"); content.append(status);
  if (receipt.saved) return;
  if (receipt.status === 401 || receipt.status === 409) {
    status.textContent = recoveryMessage(receipt.message, receipt.status);
    content.append(recoveryButton(receipt.status)); return;
  }
  status.textContent += " · 云端尚未保存，请重试";
  const retry = element("button", "重试云端保存", "monster-image-button"); retry.type = "button"; retry.dataset.saveFeedbackRetry = "";
  retry.onclick = async () => {
    retry.disabled = true;
    try {
      if (await actions.save()) { status.textContent = `${receipt.message} · 已保存到云端`; retry.remove(); }
      else {
        const code = actions.getSaveErrorStatus();
        if (code === 401 || code === 409) { status.textContent = recoveryMessage(receipt.message, code); retry.replaceWith(recoveryButton(code)); }
        else status.textContent = `${receipt.message} · 保存失败，请重试`;
      }
    } finally { retry.disabled = false; }
  };
  content.append(retry);
}
