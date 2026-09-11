import { badRequest, forbidden, conflict } from "./http-response.js";
import { TABLE_CONFIG } from "./table-config.js";

const nowIso = () => new Date().toISOString();
const randomId = () => crypto.randomUUID();

function safeJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function asJsonText(value, fallback = []) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? fallback);
}

function normalizeBooleanValue(value) {
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return 1;
    if (normalized === "false") return 0;
  }
  badRequest("布尔字段值无效。");
}

export function normalizeColumnValue(table, column, value) {
  const config = TABLE_CONFIG[table];
  if ((config?.booleanColumns || []).includes(column)) {
    return normalizeBooleanValue(value);
  }
  if ((config?.jsonColumns || []).includes(column)) {
    return asJsonText(value);
  }
  if (column === "theme_preference") {
    return value === "light" || value === "dark" ? value : null;
  }
  if (column === "event_type") {
    return ["pet", "together", "annual"].includes(value) ? value : "annual";
  }
  if (column === "role") {
    return ["owner", "member"].includes(value) ? value : "member";
  }
  if (table === "family_invitations" && column === "status") {
    return ["pending", "accepted", "declined"].includes(value) ? value : "pending";
  }
  if (table === "wardrobe_items" && column === "status") {
    return ["available", "laundry", "repair", "retired"].includes(value)
      ? value
      : "available";
  }
  if (column === "type") {
    return ["favorite", "comment", "reply", "diary", "thanks"].includes(value) ? value : "diary";
  }
  const nullableColumns = new Set([
    "last_login_date",
    "planned_date",
    "completed_at",
    "responded_at",
    "parent_id",
    "width",
    "height",
    "linked_photo_id",
    "folder_id",
    "secret_default_folder_id",
    "wearer_user_id",
    "location_id",
    "last_worn_at",
  ]);
  if (table === "notifications" && ["photo_id", "comment_id"].includes(column)) {
    return value || null;
  }
  if (nullableColumns.has(column) && (value === undefined || value === null || value === "")) {
    return null;
  }
  return value ?? "";
}

export function denormalizeRow(table, row) {
  const config = TABLE_CONFIG[table];
  if (!row || !config) return row;
  const next = { ...row };
  for (const column of config.booleanColumns || []) {
    if (Object.prototype.hasOwnProperty.call(next, column)) next[column] = Boolean(next[column]);
  }
  for (const column of config.jsonColumns || []) {
    if (Object.prototype.hasOwnProperty.call(next, column)) {
      next[column] = safeJson(next[column], []);
    }
  }
  return next;
}

export function parseFiltersFromUrl(url) {
  const filters = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (key.startsWith("eq.")) {
      const column = key.slice(3);
      if (!column) badRequest("筛选列不能为空。");
      filters.push({ op: "eq", column, value });
    }
  }
  const encoded = url.searchParams.get("filters");
  if (encoded !== null) {
    let parsed;
    try {
      parsed = JSON.parse(encoded);
    } catch {
      badRequest("filters 必须是合法 JSON 数组。");
    }
    if (!Array.isArray(parsed)) badRequest("filters 必须是 JSON 数组。");
    filters.push(...parsed);
  }
  return filters;
}

const FILTER_OPS = new Set(["eq", "neq", "gte", "lt", "in"]);

function normalizeFilterValue(config, column, value) {
  if (value === undefined) badRequest("筛选值不能为空。");
  if ((config.booleanColumns || []).includes(column)) {
    return normalizeBooleanValue(value);
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  badRequest("筛选值类型不受支持。");
}

export function validateFilters(config, filters) {
  if (!Array.isArray(filters)) badRequest("filters 必须是数组。");
  return filters.map((filter) => {
    if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
      badRequest("每个筛选条件必须是对象。");
    }
    const column = String(filter.column || "");
    if (!column || !config.columns.includes(column)) badRequest("筛选列无效。");
    const op = filter.op === undefined ? "eq" : filter.op;
    if (typeof op !== "string" || !FILTER_OPS.has(op)) badRequest("筛选操作无效。");
    if (op === "in") {
      if (!Array.isArray(filter.value)) badRequest("in 筛选值必须是数组。");
      return {
        op,
        column,
        value: filter.value.map((value) => normalizeFilterValue(config, column, value)),
      };
    }
    if (Array.isArray(filter.value)) badRequest("非 in 筛选值不能是数组。");
    if ((op === "gte" || op === "lt") && filter.value === null) {
      badRequest("范围筛选不支持 null。");
    }
    return { op, column, value: normalizeFilterValue(config, column, filter.value) };
  });
}


export function buildFilterSql(config, filters, values) {
  const validatedFilters = validateFilters(config, filters);
  const clauses = [];
  for (const filter of validatedFilters) {
    const { column, op } = filter;
    if (op === "eq") {
      if (filter.value === null) clauses.push(`${column} is null`);
      else {
        clauses.push(`${column} = ?`);
        values.push(filter.value);
      }
    } else if (op === "neq") {
      if (filter.value === null) clauses.push(`${column} is not null`);
      else {
        clauses.push(`${column} <> ?`);
        values.push(filter.value);
      }
    } else if (op === "gte") {
      clauses.push(`${column} >= ?`);
      values.push(filter.value);
    } else if (op === "lt") {
      clauses.push(`${column} < ?`);
      values.push(filter.value);
    } else if (op === "in") {
      if (!filter.value.length) {
        clauses.push("1 = 0");
        continue;
      }
      const placeholders = filter.value.map(() => "?").join(",");
      clauses.push(`${column} in (${placeholders})`);
      values.push(...filter.value);
    }
  }
  return clauses;
}

export async function buildScopeSql(env, table, config, user, values, writeMode = false, getFamilyUserIds) {
  if (!config.ownerColumn) return ["1=1"];
  if (config.scope === "own" || (writeMode && config.writeScope === "own")) {
    values.push(user.id);
    return [`${config.ownerColumn} = ?`];
  }
  if (config.scope === "comments") {
    const familyIds = await getFamilyUserIds(env, user.id);
    values.push(...familyIds);
    const placeholders = familyIds.map(() => "?").join(",");
    return [
      `photo_id in (select id from photos where user_id in (${placeholders}))`,
    ];
  }
  const userIds = await getFamilyUserIds(env, user.id);
  values.push(...userIds);
  const placeholders = userIds.map(() => "?").join(",");
  return [`${config.ownerColumn} in (${placeholders})`];
}

export function sanitizeRowForTable(table, row, user, { forceOwner = false } = {}) {
  const config = TABLE_CONFIG[table];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    badRequest("每条写入记录必须是对象。");
  }
  const result = {};
  for (const column of config.columns) {
    if (Object.prototype.hasOwnProperty.call(row, column)) {
      result[column] = normalizeColumnValue(table, column, row[column]);
    }
  }
  if (config.columns.includes("id") && !result.id) result.id = randomId();
  if (config.ownerColumn && (forceOwner || !result[config.ownerColumn])) {
    result[config.ownerColumn] = user.id;
  }
  if (config.columns.includes("created_at") && !result.created_at) result.created_at = nowIso();
  if (config.columns.includes("updated_at")) result.updated_at = nowIso();
  return result;
}

export function getRowInputColumns(config, row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) badRequest("每条写入记录必须是对象。");
  return new Set(Object.keys(row).filter((column) => config.columns.includes(column)));
}

export function getConflictColumns(config) {
  return config.conflictColumns || [config.columns.includes("id") ? "id" : config.columns[0]];
}

export async function findRowByColumns(env, table, columns, row, scope = null) {
  const values = [];
  const clauses = columns.map((column) => {
    const value = row[column];
    if (value === undefined || value === null || value === "") badRequest(`缺少冲突字段：${column}。`);
    values.push(value);
    return `${column} = ?`;
  });
  const scopeClauses = Array.isArray(scope?.clauses) ? scope.clauses : [];
  const scopeValues = Array.isArray(scope?.values) ? scope.values : [];
  const whereClauses = [...scopeClauses.map((clause) => `(${clause})`), ...clauses];
  return env.DB.prepare(`select * from ${table} where ${whereClauses.join(" and ")} limit 1`)
    .bind(...scopeValues, ...values)
    .first();
}

async function isRowWritable(env, config, user, row, getFamilyUserIds) {
  if (!config.ownerColumn) return true;
  if (config.writeScope === "own" || config.scope === "own") {
    return String(row[config.ownerColumn] || "") === String(user.id);
  }
  const familyUserIds = await getFamilyUserIds(env, user.id);
  return familyUserIds.includes(row[config.ownerColumn]);
}

function mergeUserProfileMonotonic(existing, effective, inputColumns) {
  if (!existing) return effective;
  if (inputColumns.has("login_streak")) {
    effective.login_streak = Math.max(Number(existing.login_streak) || 0, Number(effective.login_streak) || 0);
  }
  if (inputColumns.has("experience_total")) {
    effective.experience_total = Math.max(Number(existing.experience_total) || 0, Number(effective.experience_total) || 0);
  }
  if (
    inputColumns.has("last_login_date") &&
    existing.last_login_date &&
    String(existing.last_login_date) > String(effective.last_login_date || "")
  ) {
    effective.last_login_date = existing.last_login_date;
  }
  return effective;
}

export async function prepareUpsertRows(env, table, config, rawRows, user, getFamilyUserIds) {
  const conflictColumns = getConflictColumns(config);
  const scopeValues = [];
  const scopeClauses = await buildScopeSql(env, table, config, user, scopeValues, true, getFamilyUserIds);
  const writeScope = { clauses: scopeClauses, values: scopeValues };
  const entries = [];
  const seenConflictKeys = new Set();
  for (const rawRow of rawRows) {
    const inputColumns = getRowInputColumns(config, rawRow);
    const sanitized = sanitizeRowForTable(table, rawRow, user, { forceOwner: Boolean(config.ownerColumn) });
    const existing = await findRowByColumns(env, table, conflictColumns, sanitized);
    let existingById = null;
    if (inputColumns.has("id") && sanitized.id) {
      existingById = await findRowByColumns(env, table, ["id"], sanitized);
    }
    if (existingById && (!existing || existingById.id !== existing.id)) {
      if (!(await isRowWritable(env, config, user, existingById, getFamilyUserIds))) forbidden();
      conflict("The supplied record id is already in use.");
    }
    if (existing && !(await isRowWritable(env, config, user, existing, getFamilyUserIds))) forbidden();

    const effective = { ...sanitized };
    if (existing) {
      for (const column of conflictColumns) effective[column] = existing[column];
      if (config.ownerColumn) effective[config.ownerColumn] = existing[config.ownerColumn];
      if (config.columns.includes("created_at")) effective.created_at = existing.created_at;
    }
    mergeUserProfileMonotonic(existing, effective, inputColumns);
    const conflictKey = conflictColumns.map((column) => String(effective[column])).join("\u0000");
    if (seenConflictKeys.has(conflictKey)) conflict("The request contains duplicate conflict targets.");
    seenConflictKeys.add(conflictKey);
    entries.push({ effective, existing, inputColumns, conflictColumns, writeScope });
  }
  return entries;
}

export function buildMutationStatement(table, config, entry, action) {
  const { effective, inputColumns, conflictColumns, writeScope } = entry;
  const columns = new Set(inputColumns);
  for (const column of ["id", config.ownerColumn, "created_at", "updated_at", ...conflictColumns]) {
    if (column && Object.prototype.hasOwnProperty.call(effective, column)) columns.add(column);
  }
  const orderedColumns = config.columns.filter((column) => columns.has(column));
  if (!orderedColumns.length) badRequest("写入记录没有可用字段。");
  const placeholders = orderedColumns.map(() => "?").join(",");
  const values = orderedColumns.map((column) => normalizeColumnValue(table, column, effective[column]));
  if (action === "insert") {
    return { statement: `insert into ${table} (${orderedColumns.join(",")}) values (${placeholders})`, values };
  }
  const updateColumns = orderedColumns.filter(
    (column) => !conflictColumns.includes(column) && column !== "id" && column !== config.ownerColumn && column !== "created_at"
  );
  const updateSql = updateColumns.length
    ? `do update set ${updateColumns.map((column) => `${column}=excluded.${column}`).join(",")}`
    : "do nothing";
  const guardedUpdateSql = updateColumns.length && writeScope?.clauses?.length
    ? `${updateSql} where ${writeScope.clauses.map((clause) => `(${clause})`).join(" and ")}`
    : updateSql;
  return {
    statement: `insert into ${table} (${orderedColumns.join(",")}) values (${placeholders}) on conflict(${conflictColumns.join(",")}) ${guardedUpdateSql}`,
    values: [...values, ...(updateColumns.length ? writeScope?.values || [] : [])],
  };
}

export async function readCanonicalRows(env, table, config, rows, scope = null) {
  const conflictColumns = getConflictColumns(config);
  const canonical = [];
  for (const row of rows) {
    const found = await findRowByColumns(env, table, conflictColumns, row, scope);
    if (!found) forbidden("The record is no longer writable.");
    canonical.push(found);
  }
  return canonical;
}

export function changesFromD1Result(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0) || 0;
}

export function hasEmptyInFilter(filters) {
  return filters.some((filter) => filter.op === "in" && filter.value.length === 0);
}

export async function findRowsOutsideWriteScope(env, table, config, filters) {
  const values = [];
  const clauses = buildFilterSql(config, filters, values);
  const rows = await env.DB.prepare(`select 1 from ${table} where ${clauses.join(" and ")} limit 1`)
    .bind(...values)
    .first();
  return Boolean(rows);
}
