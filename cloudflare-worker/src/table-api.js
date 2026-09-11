import { badRequest, forbidden } from "./http-response.js";
import { TABLE_CONFIG } from "./table-config.js";
import {
  buildFilterSql,
  buildMutationStatement,
  buildScopeSql,
  changesFromD1Result,
  denormalizeRow,
  findRowsOutsideWriteScope,
  getConflictColumns,
  getRowInputColumns,
  hasEmptyInFilter,
  normalizeColumnValue,
  parseFiltersFromUrl,
  prepareUpsertRows,
  readCanonicalRows,
  sanitizeRowForTable,
  validateFilters,
} from "./table-query.js";

export function createTableApi(deps) {
  const {
    createActivityNotifications,
    getBearerToken,
    getFamilyUserIds,
    jsonResponse,
    nowIso = () => new Date().toISOString(),
    readJsonRequestBody,
    requireDb,
    safeJson,
    sha256Base64Url,
    isFamilyOwner,
    validateDiaryPhotoMedia,
  } = deps;

async function handleD1Logout(request, env) {
  const token = getBearerToken(request);
  if (!token) return jsonResponse(request, env, { data: true });
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const tokenHash = await sha256Base64Url(token);
  await env.DB.prepare("delete from sessions where token_hash=?").bind(tokenHash).run();
  return jsonResponse(request, env, { data: true });
}

function isPublicPhotoListRequest(url) {
  const filters = validateFilters(TABLE_CONFIG.photos, parseFiltersFromUrl(url));
  return filters.some((filter) => {
    if (filter?.op && filter.op !== "eq") return false;
    if (filter?.column !== "is_public") return false;
    const value = filter.value;
    return value === 1;
  });
}

async function handlePublicPhotoList(request, env) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;

  const url = new URL(request.url);
  const config = TABLE_CONFIG.photos;
  const filters = validateFilters(config, parseFiltersFromUrl(url)).filter((filter) => filter.column !== "is_public");
  const values = [];
  const clauses = ["is_public = 1", ...buildFilterSql(config, filters, values)];
  const orderColumn = url.searchParams.get("order") || "created_at";
  const orderDirection = url.searchParams.get("ascending") === "true" ? "asc" : "desc";
  const safeOrder = config.columns.includes(orderColumn) ? orderColumn : "created_at";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 500));
  const rows = await env.DB.prepare(
    `select * from photos where ${clauses.join(" and ")} order by ${safeOrder} ${orderDirection} limit ?`
  )
    .bind(...values, limit)
    .all();
  return jsonResponse(request, env, { data: (rows.results || []).map((row) => denormalizeRow("photos", row)) });
}

const MOOD_DIARY_TYPES = new Set([
  "tired",
  "angry",
  "excited",
  "annoyed",
  "heart",
  "calm",
  "sad",
  "happy",
]);

function getTokyoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeStrictDiaryDate(value) {
  const raw = String(value ?? "");
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const days = month === 2
    ? year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
    : [4, 6, 9, 11].includes(month) ? 30 : 31;
  if (month < 1 || month > 12 || day < 1 || day > days) return null;
  return raw;
}

function normalizeMoodDiaryTags(value) {
  const parsed = Array.isArray(value) ? value : safeJson(value, null);
  if (!Array.isArray(parsed)) return { error: "tags 必须是数组。" };
  const tags = [];
  const seen = new Set();
  for (const rawValue of parsed) {
    const tag = String(rawValue ?? "").trim().replace(/^#+/u, "").trim();
    if (!tag) continue;
    if ([...tag].length > 20) return { error: "每个标签最多 20 个字符。" };
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  if (tags.length > 8) return { error: "最多添加 8 个标签。" };
  return { tags };
}

function validateMoodDiaryRow(row, { requireDate = true, requireMood = true } = {}) {
  if (requireDate && !normalizeStrictDiaryDate(row.diary_date)) return "日期必须是有效的 YYYY-MM-DD。";
  if (row.diary_date && !normalizeStrictDiaryDate(row.diary_date)) return "日期必须是有效的 YYYY-MM-DD。";
  if (row.diary_date && row.diary_date > getTokyoDateKey()) return "不能记录未来的日记。";
  if ((requireMood || Object.prototype.hasOwnProperty.call(row, "mood")) && !MOOD_DIARY_TYPES.has(String(row.mood || ""))) {
    return "心情类型无效。";
  }
  if (Object.prototype.hasOwnProperty.call(row, "content") && [...String(row.content ?? "")].length > 5000) {
    return "心情内容最多 5000 个字符。";
  }
  if (Object.prototype.hasOwnProperty.call(row, "tags")) {
    const result = normalizeMoodDiaryTags(row.tags);
    if (result.error) return result.error;
    row.tags = JSON.stringify(result.tags);
  }
  return null;
}

async function handleTableApi(request, env, user, table) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const config = TABLE_CONFIG[table];
  if (!config) return jsonResponse(request, env, { error: "Unknown table." }, 404);

  const url = new URL(request.url);
  if (request.method === "GET") {
    const filters = validateFilters(config, parseFiltersFromUrl(url));
    const values = [];
    const clauses = [
      ...(await buildScopeSql(env, table, config, user, values, false, getFamilyUserIds)),
      ...buildFilterSql(config, filters, values),
    ];
    const orderColumn = url.searchParams.get("order") || "created_at";
    const orderDirection = url.searchParams.get("ascending") === "true" ? "asc" : "desc";
    const safeOrder = config.columns.includes(orderColumn) ? orderColumn : "created_at";
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 500));
    const offset = Math.min(500000, Math.max(0, Number(url.searchParams.get("offset")) || 0));
    const rows = await env.DB.prepare(
      `select * from ${table} where ${clauses.join(" and ")} order by ${safeOrder} ${orderDirection} limit ? offset ?`
    )
      .bind(...values, limit, offset)
      .all();
    return jsonResponse(request, env, { data: (rows.results || []).map((row) => denormalizeRow(table, row)) });
  }

  const payload = await readJsonRequestBody(request);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) badRequest("Request body must be an object.");
  if (Object.prototype.hasOwnProperty.call(payload, "onConflict")) {
    badRequest("onConflict is controlled by the server.");
  }
  const action = String(payload.action || "").toLowerCase();
  const filters = validateFilters(config, payload.filters === undefined ? [] : payload.filters);

  if (action === "insert" || action === "upsert") {
    if (!Object.prototype.hasOwnProperty.call(payload, "values")) badRequest("写入记录不能为空。");
    const rawRows = Array.isArray(payload.values) ? payload.values : [payload.values];
    if (!rawRows.length) return jsonResponse(request, env, { data: [], count: 0 });
    let entries;
    if (action === "upsert") {
      entries = await prepareUpsertRows(env, table, config, rawRows, user, getFamilyUserIds);
    } else {
      const conflictColumns = getConflictColumns(config);
      entries = rawRows.map((rawRow) => ({
        effective: sanitizeRowForTable(table, rawRow, user, { forceOwner: Boolean(config.ownerColumn) }),
        existing: null,
        inputColumns: getRowInputColumns(config, rawRow),
        conflictColumns,
      }));
    }
    for (const entry of entries) {
      if (table === "mood_diaries") {
        if (!entry.existing) {
          if (!Object.prototype.hasOwnProperty.call(entry.effective, "content")) {
            entry.effective.content = "";
            entry.inputColumns.add("content");
          }
          if (!Object.prototype.hasOwnProperty.call(entry.effective, "tags")) {
            entry.effective.tags = "[]";
            entry.inputColumns.add("tags");
          }
        }
        const moodError = validateMoodDiaryRow(entry.effective);
        if (moodError) return jsonResponse(request, env, { error: moodError }, 400);
      }
      if (table === "photos") {
        const mediaError = validateDiaryPhotoMedia(entry.effective.note);
        if (mediaError) return jsonResponse(request, env, { error: mediaError }, 400);
      }
    }

    const statements = entries.map((entry) => {
      const mutation = buildMutationStatement(table, config, entry, action);
      return env.DB.prepare(mutation.statement).bind(...mutation.values);
    });
    const results = await env.DB.batch(statements);
    const count = (results || []).reduce((total, result) => total + changesFromD1Result(result), 0);
    const canonicalRows = await readCanonicalRows(
      env,
      table,
      config,
      entries.map((entry) => entry.effective),
      entries[0]?.writeScope,
    );
    if (["photos", "gratitude_notes", "photo_favorites", "photo_comments", "wishes", "shopping_items"].includes(table)) {
      const activityRows = entries
        .map((entry, index) => ({ entry, row: canonicalRows[index], result: results[index] }))
        .filter(({ entry, result }) =>
          changesFromD1Result(result) > 0 && (
            action === "insert" ||
            ["photo_favorites", "photos", "wishes", "shopping_items"].includes(table) && !entry.existing
          )
        )
        .map(({ row }) => row);
      if (activityRows.length) await createActivityNotifications(env, table, activityRows, user.id);
    }
    return jsonResponse(request, env, {
      data: canonicalRows.map((row) => denormalizeRow(table, row)),
      count,
    });
  }

  if (action === "update") {
    if (!filters.length) badRequest("更新必须包含至少一个筛选条件。");
    const rawUpdates = payload.values;
    if (!rawUpdates || typeof rawUpdates !== "object" || Array.isArray(rawUpdates)) {
      badRequest("更新值必须是对象。");
    }
    const adminUnpinRequest =
      table === "photos" &&
      rawUpdates.is_pinned === false &&
      Object.keys(rawUpdates).length === 1 &&
      (await isFamilyOwner(env, user.id));
    const updates = sanitizeRowForTable(table, rawUpdates, user);
    if (table === "mood_diaries") {
      if (Object.prototype.hasOwnProperty.call(rawUpdates, "diary_date")) {
        return jsonResponse(request, env, { error: "心情日记日期不可修改。" }, 400);
      }
      const moodError = validateMoodDiaryRow(updates, { requireDate: false, requireMood: false });
      if (moodError) return jsonResponse(request, env, { error: moodError }, 400);
    }
    if (table === "photos" && Object.prototype.hasOwnProperty.call(updates, "note")) {
      const mediaError = validateDiaryPhotoMedia(updates.note);
      if (mediaError) return jsonResponse(request, env, { error: mediaError }, 400);
    }
    delete updates.id;
    delete updates.created_at;
    if (config.ownerColumn) delete updates[config.ownerColumn];
    const updateColumns = Object.keys(updates).filter(
      (column) => config.columns.includes(column) && column !== "updated_at"
    );
    if (config.columns.includes("updated_at")) updateColumns.push("updated_at");
    if (!updateColumns.length) badRequest("没有可更新的字段。");

    const scopeValues = [];
    const scope = await buildScopeSql(env, table, config, user, scopeValues, !adminUnpinRequest, getFamilyUserIds);
    const whereValues = [...scopeValues];
    const clauses = [...scope, ...buildFilterSql(config, filters, whereValues)];
    const before = await env.DB.prepare(`select * from ${table} where ${clauses.join(" and ")}`)
      .bind(...whereValues)
      .all();
    const targetRows = before.results || [];
    if (!targetRows.length) {
      if (!hasEmptyInFilter(filters) && await findRowsOutsideWriteScope(env, table, config, filters)) forbidden();
      return jsonResponse(request, env, { data: [], count: 0 });
    }
    if (table === "user_profiles") {
      const current = targetRows[0];
      if (Object.prototype.hasOwnProperty.call(updates, "login_streak")) {
        updates.login_streak = Math.max(Number(current.login_streak) || 0, Number(updates.login_streak) || 0);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "experience_total")) {
        updates.experience_total = Math.max(Number(current.experience_total) || 0, Number(updates.experience_total) || 0);
      }
      if (
        Object.prototype.hasOwnProperty.call(updates, "last_login_date") &&
        current.last_login_date &&
        String(current.last_login_date) > String(updates.last_login_date || "")
      ) {
        updates.last_login_date = current.last_login_date;
      }
    }
    const setValues = updateColumns.map((column) =>
      column === "updated_at" ? nowIso() : normalizeColumnValue(table, column, updates[column])
    );
    const result = await env.DB.prepare(
      `update ${table} set ${updateColumns.map((column) => `${column}=?`).join(",")} where ${clauses.join(" and ")}`
    )
      .bind(...setValues, ...whereValues)
      .run();
    const canonicalRows = await readCanonicalRows(env, table, config, targetRows, {
      clauses: scope,
      values: scopeValues,
    });
    return jsonResponse(request, env, {
      data: canonicalRows.map((row) => denormalizeRow(table, row)),
      count: changesFromD1Result(result),
    });
  }

  if (action === "delete") {
    if (!filters.length) badRequest("删除必须包含至少一个筛选条件。");
    const values = [];
    const scope = await buildScopeSql(env, table, config, user, values, true, getFamilyUserIds);
    const clauses = [...scope, ...buildFilterSql(config, filters, values)];
    const rows = await env.DB.prepare(`select * from ${table} where ${clauses.join(" and ")}`)
      .bind(...values)
      .all();
    const targetRows = rows.results || [];
    if (!targetRows.length) {
      if (!hasEmptyInFilter(filters) && await findRowsOutsideWriteScope(env, table, config, filters)) forbidden();
      return jsonResponse(request, env, { data: [], count: 0 });
    }
    const result = await env.DB.prepare(`delete from ${table} where ${clauses.join(" and ")}`)
      .bind(...values)
      .run();
    return jsonResponse(request, env, {
      data: targetRows.map((row) => denormalizeRow(table, row)),
      count: changesFromD1Result(result),
    });
  }

  return jsonResponse(request, env, { error: "Unsupported table action." }, 400);
}
  return { handleD1Logout, handlePublicPhotoList, handleTableApi, isPublicPhotoListRequest };
}
