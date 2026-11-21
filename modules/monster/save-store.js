import { validateMonsterSave } from "./save-state.js";

function accountChanged() {
  return Object.assign(new Error("登录账号已变更，请重新进入游戏。"), { code: "ACCOUNT_CHANGED", status: 401 });
}

function revisionConflict() {
  return Object.assign(new Error("云存档已被另一台设备更新，请重新载入后继续。"), { status: 409 });
}

// Cloud is authoritative. No device-global save or offline write fallback.
export function createMonsterSaveStore({ request, getSession }) {
  let session;
  let revision = null;
  let writing = false;
  function assertAccount() {
    const current = getSession();
    if (!session?.access_token || current?.user?.id !== session.user.id || current.access_token !== session.access_token) throw accountChanged();
  }
  async function send(options) {
    assertAccount();
    const result = await request("/api/monster/save", options, { sessionOverride: session, refreshSession: false });
    assertAccount();
    if (result.userId !== session.user.id) throw accountChanged();
    return result;
  }
  return {
    async load() {
      const current = getSession();
      if (!current?.user?.id || !current.access_token) throw Object.assign(new Error("请先返回咻蛋之家登录，再进入游戏。"), { status: 401 });
      session = structuredClone(current);
      revision = null;
      const result = await send({});
      if (!Number.isSafeInteger(result.revision) || result.revision < 0) throw new Error("云存档版本无效，请重试。");
      if (result.state !== null) validateMonsterSave(result.state);
      revision = result.revision;
      return result.state;
    },
    async getServerTime() {
      assertAccount();
      if (revision === null) throw new Error("请先载入云存档。");
      if (writing) throw revisionConflict();
      const loadedSession = session;
      const loadedRevision = revision;
      const result = await send({});
      if (session !== loadedSession) throw accountChanged();
      if (writing || revision !== loadedRevision || result.revision !== loadedRevision) throw revisionConflict();
      const value = typeof result.serverTime === "string" ? Date.parse(result.serverTime) : NaN;
      if (!Number.isSafeInteger(value) || new Date(value).toISOString() !== result.serverTime) throw new Error("服务器时间无效，请重试。");
      return value;
    },
    async save(state) {
      assertAccount();
      if (revision === null) throw new Error("请先载入云存档。");
      if (writing) throw new Error("云存档正在保存，请稍候。");
      validateMonsterSave(state);
      const body = JSON.stringify({ expectedRevision: revision, state });
      writing = true;
      try {
        const result = await send({ method: "PUT", body });
        if (result.revision !== revision + 1) throw new Error("云存档版本不匹配，请重新载入。");
        revision = result.revision;
        return result;
      } finally { writing = false; }
    },
  };
}
