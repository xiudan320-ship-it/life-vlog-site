const ALLOWED_TABLES = new Set([
  "anniversaries",
  "gratitude_notes",
  "photo_favorites",
  "recipes",
  "secret_folders",
  "trash_items",
  "user_profiles",
  "weekend_plans",
  "wishes",
]);

function requireDatabase(getDatabase) {
  const database = getDatabase?.();
  if (!database) throw new Error("Cloudflare 数据库尚未连接。");
  return database;
}

function table(database, tableName) {
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new Error(`不允许访问数据表：${tableName}`);
  }
  return database.from(tableName);
}

function applyFilters(query, filters = {}) {
  return Object.entries(filters).reduce((current, [column, value]) => {
    if (Array.isArray(value)) return current.in(column, value);
    return current.eq(column, value);
  }, query);
}

function applyResultShape(query, { select = "", single = false, maybeSingle = false } = {}) {
  let shaped = query;
  if (select) shaped = shaped.select(select);
  if (single) return shaped.single();
  if (maybeSingle) return shaped.maybeSingle();
  return shaped;
}

export function createHouseholdRepository({ getDatabase, getSession }) {
  function database() {
    return requireDatabase(getDatabase);
  }

  function currentUserId() {
    return getSession?.()?.user?.id || "";
  }

  return {
    async list(
      tableName,
      {
        columns = "*",
        filters = {},
        order = [],
        limit = 0,
        maybeSingle = false,
        single = false,
      } = {}
    ) {
      let query = applyFilters(table(database(), tableName).select(columns), filters);
      for (const entry of order) {
        query = query.order(entry.column, { ascending: entry.ascending !== false });
      }
      if (limit > 0) query = query.limit(limit);
      if (single) return query.single();
      if (maybeSingle) return query.maybeSingle();
      return query;
    },

    async insert(tableName, payload, options = {}) {
      return applyResultShape(table(database(), tableName).insert(payload), options);
    },

    async upsert(tableName, payload, { onConflict = "", ...shape } = {}) {
      const options = onConflict ? { onConflict } : undefined;
      return applyResultShape(table(database(), tableName).upsert(payload, options), shape);
    },

    async update(tableName, payload, filters = {}, options = {}) {
      const query = applyFilters(table(database(), tableName).update(payload), filters);
      return applyResultShape(query, options);
    },

    async updateOwned(tableName, payload, filters = {}, options = {}) {
      const userId = currentUserId();
      return this.update(
        tableName,
        payload,
        userId ? { ...filters, user_id: userId } : filters,
        options
      );
    },

    async remove(tableName, filters = {}, { owned = false, select = "" } = {}) {
      const userId = owned ? currentUserId() : "";
      let query = applyFilters(
        table(database(), tableName).delete(),
        userId ? { ...filters, user_id: userId } : filters
      );
      if (select) query = query.select(select);
      return query;
    },

    async rpc(name, args = {}) {
      return database().rpc(name, args);
    },
  };
}
