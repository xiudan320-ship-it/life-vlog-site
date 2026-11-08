import { validateMonsterSave } from "./save-state.js";

function accountChanged() {
  return Object.assign(new Error("登录账号已变更，请重新进入游戏。"), { code: "ACCOUNT_CHANGED", status: 401 });
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
