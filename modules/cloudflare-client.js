const SESSION_ROLLING_DAYS = 3650;
const SESSION_REFRESH_WINDOW_MS = 30 * 86400 * 1000;
const LOGOUT_TIMEOUT_MS = 8_000;

export function classifyCloudflareError(error) {
  const status = Number(error?.status);
  if (status === 401) return "401";
  if (status === 403) return "403";
  if (status === 429) return "429";
  if (status >= 500 && status <= 599) return "5xx";
  if (error?.name === "AbortError" || /timeout/i.test(String(error?.message || ""))) return "timeout";
  if (error instanceof TypeError || /network|fetch|offline/i.test(String(error?.message || ""))) return "network";
  return "unknown";
}

function asError(error) {
  return error instanceof Error
    ? error
    : new Error(String(error?.message || error || "Request failed"));
}

class CloudflareQueryBuilder {
  constructor(table, request) {
    this.table = table;
    this.request = request;
    this.action = "select";
    this.values = null;
    this.filters = [];
    this.orderColumn = "created_at";
    this.ascending = false;
    this.limitCount = 500;
    this.offsetCount = 0;
    this.singleMode = false;
  }

  select() {
    return this;
  }

  insert(values) {
    this.action = "insert";
    this.values = values;
    return this;
  }

  upsert(values) {
    this.action = "upsert";
    this.values = values;
    return this;
  }

  update(values) {
    this.action = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column, value) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ op: "neq", column, value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ op: "gte", column, value });
    return this;
  }

  lt(column, value) {
    this.filters.push({ op: "lt", column, value });
    return this;
  }

  in(column, values) {
    this.filters.push({ op: "in", column, value: values });
    return this;
  }

  order(column, options = {}) {
    this.orderColumn = column;
    this.ascending = Boolean(options.ascending);
    return this;
  }

  limit(value) {
    this.limitCount = value;
    return this;
  }

  offset(value) {
    this.offsetCount = value;
    return this;
  }

  single() {
    this.singleMode = true;
    return this.execute();
  }

  maybeSingle() {
    this.singleMode = true;
    return this.execute({ maybe: true });
  }

  async execute() {
    try {
      let payload;
      if (this.action === "select") {
        const params = new URLSearchParams({
          filters: JSON.stringify(this.filters),
          order: this.orderColumn,
          ascending: String(this.ascending),
          limit: String(this.limitCount),
          offset: String(this.offsetCount),
        });
        payload = await this.request(
          `/api/table/${encodeURIComponent(this.table)}?${params}`
        );
      } else {
        payload = await this.request(
          `/api/table/${encodeURIComponent(this.table)}`,
          {
            method: "POST",
            body: JSON.stringify({
              action: this.action,
              values: this.values,
              filters: this.filters,
            }),
          }
        );
      }
      let data = payload.data ?? [];
      if (this.singleMode) data = Array.isArray(data) ? data[0] || null : data;
      return { data, error: null };
    } catch (error) {
      return { data: this.singleMode ? null : [], error };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

export function createCloudflareBackend({
  endpoint,
  authKey,
  backupDb,
  backupStore,
  usernameToEmail,
  getActiveSession,
  storage = globalThis.localStorage,
  indexedDb = globalThis.indexedDB,
  navigatorApi = globalThis.navigator,
  fetchApi = globalThis.fetch,
  onRequestError = () => {},
}) {
  const getEndpoint = () => String(endpoint || "").replace(/\/+$/, "");
  let sessionGeneration = 0;
  let backupWriteChain = Promise.resolve();
  const logoutPromises = new Map();
  let latestLogoutOperation = null;

  function readSession() {
    try {
      const parsed = JSON.parse(storage?.getItem(authKey) || "null");
      if (!parsed?.access_token || !parsed?.user?.id) return null;
      if (
        parsed.expires_at &&
        new Date(parsed.expires_at).getTime() <= Date.now()
      ) {
        parsed.offline_only = true;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function openBackupDb() {
    return new Promise((resolve, reject) => {
      if (!indexedDb) {
        resolve(null);
        return;
      }
      const request = indexedDb.open(backupDb, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(backupStore)) {
          db.createObjectStore(backupStore);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function readSessionBackup() {
    try {
      const db = await openBackupDb();
      if (!db) return null;
      const value = await new Promise((resolve, reject) => {
        const transaction = db.transaction(backupStore, "readonly");
        const request = transaction.objectStore(backupStore).get(authKey);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return value?.access_token && value?.user?.id ? value : null;
    } catch {
      return null;
    }
  }

  async function writeSessionBackup(nextSession) {
    const db = await openBackupDb();
    if (!db) return { persisted: false };
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(backupStore, "readwrite");
        const store = transaction.objectStore(backupStore);
        if (nextSession?.access_token) store.put(nextSession, authKey);
        else store.delete(authKey);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
      });
      return { persisted: true };
    } finally {
      db.close();
    }
  }

  function enqueueSessionBackup(nextSession) {
    const operation = backupWriteChain.then(() => writeSessionBackup(nextSession));
    backupWriteChain = operation.catch(() => {});
    void operation.catch(() => {});
    return operation;
  }

  function ignoreBackupFailure(operation) {
    operation?.catch?.(() => {});
  }

  async function restoreSessionBackup() {
    const current = readSession();
    if (current) {
      try { await enqueueSessionBackup(current); } catch {}
      return current;
    }
    const backup = await readSessionBackup();
    if (!backup) return null;
    storage?.setItem(authKey, JSON.stringify(backup));
    return backup;
  }

  function writeSession(nextSession) {
    sessionGeneration += 1;
    if (nextSession?.access_token) {
      storage?.setItem(authKey, JSON.stringify(nextSession));
    } else {
      storage?.removeItem(authKey);
    }
    return enqueueSessionBackup(nextSession);
  }

  function currentSession() {
    return getActiveSession?.() || readSession();
  }

  function isCurrentSession(session, generation) {
    const current = currentSession();
    return Boolean(
      session?.access_token &&
      current?.access_token === session.access_token &&
      current?.user?.id === session.user?.id &&
      generation === sessionGeneration
    );
  }

  function clearLocalSession() {
    sessionGeneration += 1;
    let localError = null;
    try {
      storage?.removeItem(authKey);
    } catch (error) {
      localError = asError(error);
    }
    const backupPromise = enqueueSessionBackup(null);
    return { localError, backupPromise };
  }

 function createSession(data) {
   const loginName = data?.user?.username || "User";
   const displayName = data?.profile?.username || loginName;
    const boundEmail = String(data?.user?.email || "").trim().toLowerCase();
   return {
     access_token: data.token,
     expires_at: data.expires_at,
     user: {
       id: data.user.id,
        email: boundEmail || usernameToEmail(loginName),
        user_metadata: {
          username: displayName,
          login_username: loginName,
          bound_email: boundEmail,
        },
     },
   };
 }

  async function request(
    path,
    options = {},
    { sessionOverride = undefined, tokenOverride = undefined, refreshSession = true } = {},
  ) {
    const headers = new Headers(options.headers || {});
    if (
      !headers.has("Content-Type") &&
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }
    const activeSession = sessionOverride === undefined ? currentSession() : sessionOverride;
    const token = tokenOverride === undefined ? activeSession?.access_token : tokenOverride;
    const capturedGeneration = sessionGeneration;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    let response;
    try {
      response = await fetchApi(`${getEndpoint()}${path}`, {
        ...options,
        headers,
      });
    } catch (error) {
      const typedError = asError(error);
      typedError.status = error?.status;
      typedError.kind = classifyCloudflareError(error);
      try { onRequestError(typedError); } catch {}
      throw typedError;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Cloudflare 返回 ${response.status}`);
      error.status = response.status;
      error.kind = classifyCloudflareError(error);
      try { onRequestError(error); } catch {}
      throw error;
    }
    const expiresAt = new Date(activeSession?.expires_at || "").getTime();
    const shouldRefreshStoredSession =
      refreshSession &&
      activeSession?.access_token &&
      path !== "/api/auth/login" &&
      path !== "/api/auth/register" &&
      (activeSession.offline_only ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now() + SESSION_REFRESH_WINDOW_MS);
    if (shouldRefreshStoredSession && isCurrentSession(activeSession, capturedGeneration)) {
      const nextSession = {
        ...activeSession,
        expires_at: new Date(Date.now() + SESSION_ROLLING_DAYS * 86400 * 1000).toISOString(),
      };
      delete nextSession.offline_only;
      if (isCurrentSession(activeSession, capturedGeneration)) {
        ignoreBackupFailure(writeSession(nextSession));
      }
    }
    return data;
  }

  function createClient() {
    const listeners = new Set();
    const notify = (event, nextSession) => {
      listeners.forEach((listener) => listener(event, nextSession));
    };

    async function performSignOut(token) {
      const { localError, backupPromise } = clearLocalSession();
      try { notify("SIGNED_OUT", null); } catch {}

      let backupError = null;
      try {
        await backupPromise;
      } catch (error) {
        backupError = asError(error);
      }

      let serverRevoked = true;
      let serverError = null;
      let timeoutCleanup = null;
      if (token) {
        let signal;
        if (globalThis.AbortSignal?.timeout) {
          signal = globalThis.AbortSignal.timeout(LOGOUT_TIMEOUT_MS);
        } else if (globalThis.AbortController && globalThis.setTimeout) {
          const controller = new AbortController();
          const timeoutId = globalThis.setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS);
          signal = controller.signal;
          timeoutCleanup = () => globalThis.clearTimeout(timeoutId);
        }
        try {
          await request(
            "/api/auth/logout",
            { method: "POST", body: JSON.stringify({}), ...(signal ? { signal } : {}) },
            { sessionOverride: null, tokenOverride: token, refreshSession: false },
          );
        } catch (error) {
          if (Number(error?.status) !== 401) {
            serverRevoked = false;
            serverError = asError(error);
          }
        } finally {
          timeoutCleanup?.();
        }
      }

      const localCleared = !localError && !backupError;
      const error = localCleared
        ? serverError
        : localError || backupError;
      return {
        error: error || null,
        localCleared,
        serverRevoked,
        serverStatus: serverError?.status || (serverRevoked && token ? 200 : null),
      };
    }

    async function commitSignedInSession(nextSession) {
      let backup;
      let backupPromise;
      try {
        backupPromise = writeSession(nextSession);
      } catch (error) {
        throw asError(error);
      }
      try {
        backup = await backupPromise;
      } catch (error) {
        backup = { persisted: false, error: asError(error) };
      }
      try { notify("SIGNED_IN", nextSession); } catch {}
      try {
        const persistPromise = navigatorApi?.storage?.persist?.();
        persistPromise?.catch?.(() => {});
      } catch {}
      return { data: { session: nextSession }, error: null, backup };
    }

    return {
      auth: {
        async getSession() {
          return { data: { session: readSession() } };
        },
        onAuthStateChange(callback) {
          listeners.add(callback);
          return {
            data: {
              subscription: {
                unsubscribe: () => listeners.delete(callback),
              },
            },
          };
        },
        async signInWithPassword({ email, password }) {
          try {
            const username = String(email || "").split("@")[0];
            const data = await request("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({ username, password }),
            });
            const nextSession = createSession(data);
            return await commitSignedInSession(nextSession);
          } catch (error) {
            return { data: null, error };
          }
        },
        async signUp({ email, password, options = {} }) {
          try {
            const username =
              options.data?.username || String(email || "").split("@")[0];
            const inviteCode =
              options.data?.inviteCode || options.data?.invite_code || "";
            const data = await request("/api/auth/register", {
              method: "POST",
              body: JSON.stringify({
                username,
                password,
                invite_code: inviteCode,
              }),
            });
            const nextSession = createSession(data);
            return await commitSignedInSession(nextSession);
          } catch (error) {
            return { data: null, error };
          }
        },
        signOut() {
          const token = currentSession()?.access_token || "";
          const key = token || "no-session";
          const existing = logoutPromises.get(key);
          if (existing) return existing;
          if (!token && latestLogoutOperation) return latestLogoutOperation;
          const operation = performSignOut(token);
          logoutPromises.set(key, operation);
          latestLogoutOperation = operation;
          void operation.finally(() => {
            if (logoutPromises.get(key) === operation) logoutPromises.delete(key);
            if (latestLogoutOperation === operation) latestLogoutOperation = null;
          }).catch(() => {});
          return operation;
        },
        async updateUser(updates) {
          try {
            if (updates.password) {
              await request("/api/auth/password", {
                method: "POST",
                body: JSON.stringify({ password: updates.password }),
              });
            }
           const activeSession = getActiveSession();
           if (updates.data?.username && activeSession?.user) {
             activeSession.user.user_metadata = {
               ...(activeSession.user.user_metadata || {}),
               username: updates.data.username,
             };
             ignoreBackupFailure(writeSession(activeSession));
           }
            if (updates.data?.bound_email && activeSession?.user) {
              activeSession.user.user_metadata = {
                ...(activeSession.user.user_metadata || {}),
                bound_email: String(updates.data.bound_email).trim().toLowerCase(),
              };
              activeSession.user.email = String(updates.data.bound_email).trim().toLowerCase();
               ignoreBackupFailure(writeSession(activeSession));
            }
           return { data: { user: activeSession?.user || null }, error: null };
         } catch (error) {
           return { data: null, error };
         }
       },
     },
      account: {
        async requestEmailBind(email) {
          try {
            const data = await request("/api/account/email/request", {
              method: "POST",
              body: JSON.stringify({ email }),
            });
            return { data: data.data ?? data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
        async confirmEmailBind(email, code) {
          try {
            const data = await request("/api/account/email/confirm", {
              method: "POST",
              body: JSON.stringify({ email, code }),
            });
            return { data: data.data ?? data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
        async requestPasswordReset(email) {
          try {
            const data = await request("/api/auth/password-reset/request", {
              method: "POST",
              body: JSON.stringify({ email }),
            });
            return { data: data.data ?? data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
        async confirmPasswordReset(email, code, password) {
          try {
            const data = await request("/api/auth/password-reset/confirm", {
              method: "POST",
              body: JSON.stringify({ email, code, password }),
            });
            return { data: data.data ?? data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
      },
     from(table) {
       return new CloudflareQueryBuilder(table, request);
     },
      async rpc(name, payload = {}) {
        try {
          const data = await request(`/api/rpc/${name}`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          return { data: data.data ?? data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
    };
  }

  return {
    createClient,
    getEndpoint,
    readSession,
    readSessionBackup,
    request,
    restoreSessionBackup,
    writeSession,
    writeSessionBackup,
  };
}
