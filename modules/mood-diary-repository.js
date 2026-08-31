import {
  getMonthRange,
  normalizeDiaryDate,
  normalizeMood,
  normalizeMoodTags,
} from "./mood-diary-shared.js";

function asRepositoryError(error, fallback = "心情日记请求失败") {
  if (error instanceof Error) return error;
  return new Error(String(error?.message || error || fallback));
}

function requireUserId(getSession) {
  const userId = String(getSession?.()?.user?.id || "").trim();
  if (!userId) throw new Error("请先登录后再记录心情");
  return userId;
}

function normalizeRow(row) {
  if (!row || typeof row !== "object") return null;
  const diaryDate = normalizeDiaryDate(row.diary_date);
  const mood = normalizeMood(row.mood);
  if (!row.id || !diaryDate || !mood) return null;
  return {
    ...row,
    id: String(row.id),
    user_id: String(row.user_id || ""),
    diary_date: diaryDate,
    mood,
    content: String(row.content || ""),
    tags: normalizeMoodTags(row.tags),
  };
}

export function createMoodDiaryRepository({ getDatabase, getSession }) {
  function table() {
    const database = getDatabase?.();
    if (!database?.from) throw new Error("云端数据库尚未准备好");
    return database.from("mood_diaries");
  }

  async function listMonth(monthKey) {
    const { start, nextMonthStart } = getMonthRange(monthKey);
    const result = await table()
      .select("*")
      .gte("diary_date", start)
      .lt("diary_date", nextMonthStart)
      .order("diary_date", { ascending: false })
      .limit(500);
    if (result?.error) throw asRepositoryError(result.error);
    return (result?.data || []).map(normalizeRow).filter(Boolean);
  }

  async function listDay(dateKey) {
    const normalizedDate = normalizeDiaryDate(dateKey);
    if (!normalizedDate) throw new RangeError("dateKey must use YYYY-MM-DD");
    const result = await table()
      .select("*")
      .eq("diary_date", normalizedDate)
      .order("user_id", { ascending: true })
      .limit(500);
    if (result?.error) throw asRepositoryError(result.error);
    return (result?.data || []).map(normalizeRow).filter(Boolean);
  }

  async function listHistory({ limit = 30, offset = 0 } = {}) {
    const result = await table()
      .select("*")
      .order("diary_date", { ascending: false })
      .limit(Math.min(30, Math.max(1, Number(limit) || 30)))
      .offset(Math.max(0, Number(offset) || 0));
    if (result?.error) throw asRepositoryError(result.error);
    return (result?.data || []).map(normalizeRow).filter(Boolean);
  }

  async function upsert({ id, diary_date, mood, content = "", tags = [] }) {
    const userId = requireUserId(getSession);
    const normalizedDate = normalizeDiaryDate(diary_date);
    const normalizedMood = normalizeMood(mood);
    if (!normalizedDate || !normalizedMood) throw new Error("心情或日期无效");
    const payload = {
      ...(id ? { id: String(id) } : {}),
      user_id: userId,
      diary_date: normalizedDate,
      mood: normalizedMood,
      content: String(content ?? ""),
      tags: normalizeMoodTags(tags),
    };
    const result = await table()
      .upsert(payload, { onConflict: "user_id,diary_date" })
      .select("*")
      .single();
    if (result?.error) throw asRepositoryError(result.error, "心情日记保存失败");
    const row = normalizeRow(result?.data);
    if (!row) throw new Error("心情日记保存响应无效");
    return row;
  }

  async function update(id, { mood, content = "", tags = [] }) {
    const userId = requireUserId(getSession);
    const normalizedMood = normalizeMood(mood);
    if (!id || !normalizedMood) throw new Error("心情日记参数无效");
    const result = await table()
      .update({ mood: normalizedMood, content: String(content ?? ""), tags: normalizeMoodTags(tags) })
      .eq("id", String(id))
      .eq("user_id", userId)
      .select("*")
      .single();
    if (result?.error) throw asRepositoryError(result.error, "心情日记更新失败");
    const row = normalizeRow(result?.data);
    if (!row) throw new Error("心情日记更新响应无效");
    return row;
  }

  async function remove(id) {
    const userId = requireUserId(getSession);
    if (!id) throw new Error("心情日记参数无效");
    const result = await table()
      .delete()
      .eq("id", String(id))
      .eq("user_id", userId);
    if (result?.error) throw asRepositoryError(result.error, "心情日记删除失败");
    return true;
  }

  return Object.freeze({ listDay, listMonth, listHistory, upsert, update, remove });
}
