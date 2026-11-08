import { validateMonsterSave } from "../../modules/monster/save-state.js";
import { badRequest, conflict, WorkerHttpError } from "./http-response.js";

// The authenticated user owns the record. Family membership never grants access.
export async function handleMonsterSave(request, env, user, respond) {
  if (request.method === "GET") {
    const row = await env.DB.prepare("select state_json, revision, updated_at from monster_saves where user_id=?")
      .bind(user.id).first();
    return respond({ userId: user.id, revision: row?.revision || 0, updatedAt: row?.updated_at || null, state: row ? JSON.parse(row.state_json) : null });
  }
  if (request.method !== "PUT") throw new WorkerHttpError(405, "Method not allowed.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 1024 * 1024) throw new WorkerHttpError(413, "游戏存档超过 1 MiB。");
  let payload;
  try { payload = JSON.parse(text); } catch { badRequest("Invalid save JSON."); }
  if (!Number.isSafeInteger(payload?.expectedRevision) || payload.expectedRevision < 0) badRequest("Invalid save revision.");
  try { validateMonsterSave(payload.state); } catch (error) { badRequest(error.message); }
  const updatedAt = new Date().toISOString();
  const result = payload.expectedRevision === 0
    ? await env.DB.prepare("insert into monster_saves(user_id, state_json, revision, updated_at) values(?,?,1,?) on conflict(user_id) do nothing")
      .bind(user.id, JSON.stringify(payload.state), updatedAt).run()
    : await env.DB.prepare("update monster_saves set state_json=?, revision=revision+1, updated_at=? where user_id=? and revision=?")
      .bind(JSON.stringify(payload.state), updatedAt, user.id, payload.expectedRevision).run();
  if (result.meta.changes !== 1) conflict("云存档已被另一台设备更新，请重新载入后继续。");
  return respond({ userId: user.id, revision: payload.expectedRevision + 1, updatedAt });
}
