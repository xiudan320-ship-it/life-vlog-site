const SESSION_ROLLING_DAYS = 3650;
const SESSION_REFRESH_WINDOW_MS = 30 * 86400 * 1000;

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
    this.singleMode = false;
    this.onConflict = "";
  }

  select() {
    return this;
  }

  insert(values) {
    this.action = "insert";
    this.values = values;
    return this;
  }

  upsert(values, options = {}) {
    this.action = "upsert";
    this.values = values;
    this.onConflict = options.onConflict || "";
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

  order(column, options = {}) {
    this.orderColumn = column;
    this.ascending = Boolean(options.ascending);
    return this;
  }

  limit(value) {
    this.limitCount = value;
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
              onConflict: this.onConflict,
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
  publicUrl,
  authKey,
  backupDb,
  backupStore,
  usernameToEmail,
  getActiveSession,
  storage = globalThis.localStorage,
  indexedDb = globalThis.indexedDB,
  navigatorApi = globalThis.navigator,
  fetchApi = globalThis.fetch,
}) {
  const getEndpoint = () => String(endpoint || "").replace(/\/+$/, "");

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
    try {
      const db = await openBackupDb();
      if (!db) return;
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(backupStore, "readwrite");
        const store = transaction.objectStore(backupStore);
        if (nextSession?.access_token) store.put(nextSession, authKey);
        else store.delete(authKey);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    } catch {
      // localStorage remains the fallback where IndexedDB is unavailable.
    }
  }

  async function restoreSessionBackup() {
    const current = readSession();
    if (current) {
      void writeSessionBackup(current);
      return current;
    }
    const backup = await readSessionBackup();
    if (!backup) return null;
    storage?.setItem(authKey, JSON.stringify(backup));
    return backup;
  }

  function writeSession(nextSession) {
    if (nextSession?.access_token) {
      storage?.setItem(authKey, JSON.stringify(nextSession));
    } else {
      storage?.removeItem(authKey);
    }
    void writeSessionBackup(nextSession);
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

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (
      !headers.has("Content-Type") &&
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }
    const activeSession = getActiveSession() || readSession();
    if (activeSession?.access_token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${activeSession.access_token}`);
    }
    const response = await fetchApi(`${getEndpoint()}${path}`, {
      ...options,
      headers,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Cloudflare 返回 ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const expiresAt = new Date(activeSession?.expires_at || "").getTime();
    const shouldRefreshStoredSession =
      activeSession?.access_token &&
      path !== "/api/auth/login" &&
      path !== "/api/auth/register" &&
      (activeSession.offline_only ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now() + SESSION_REFRESH_WINDOW_MS);
    if (shouldRefreshStoredSession) {
      activeSession.expires_at = new Date(
        Date.now() + SESSION_ROLLING_DAYS * 86400 * 1000
      ).toISOString();
      delete activeSession.offline_only;
      writeSession(activeSession);
    }
    return data;
  }

  function createClient() {
    const listeners = new Set();
    const notify = (event, nextSession) => {
      listeners.forEach((listener) => listener(event, nextSession));
    };

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
            writeSession(nextSession);
            await writeSessionBackup(nextSession);
            void navigatorApi?.storage?.persist?.();
            notify("SIGNED_IN", nextSession);
            return { data: { session: nextSession }, error: null };
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
            writeSession(nextSession);
            await writeSessionBackup(nextSession);
            void navigatorApi?.storage?.persist?.();
            notify("SIGNED_IN", nextSession);
            return { data: { session: nextSession }, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
        async signOut() {
          writeSession(null);
          notify("SIGNED_OUT", null);
          return { error: null };
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
             writeSession(activeSession);
           }
            if (updates.data?.bound_email && activeSession?.user) {
              activeSession.user.user_metadata = {
                ...(activeSession.user.user_metadata || {}),
                bound_email: String(updates.data.bound_email).trim().toLowerCase(),
              };
              activeSession.user.email = String(updates.data.bound_email).trim().toLowerCase();
              writeSession(activeSession);
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
      storage: {
        from() {
          return {
            getPublicUrl(path) {
              return {
                data: {
                  publicUrl: path
                    ? `${publicUrl}/${String(path).replace(/^r2:/, "")}`
                    : "",
                },
              };
            },
            async upload() {
              return {
                error: new Error("旧存储已停用，请使用 Cloudflare R2。"),
              };
            },
            async remove() {
              return { error: null };
            },
          };
        },
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
