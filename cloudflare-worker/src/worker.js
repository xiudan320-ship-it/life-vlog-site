import { buildPushPayload } from "@block65/webcrypto-web-push";
import { auditR2Objects } from "./r2-audit.js";
import { badRequest, conflict, forbidden, WorkerHttpError } from "./http-response.js";
import {
  buildFilterSql,
  buildScopeSql,
  denormalizeRow,
  normalizeColumnValue,
  sanitizeRowForTable,
} from "./table-query.js";
import { createTableApi } from "./table-api.js";
import { TABLE_CONFIG } from "./table-config.js";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const SESSION_DAYS = 3650;
const SESSION_REFRESH_WINDOW_MS = 30 * 86400 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
const PASSWORD_HASH_ITERATIONS = 100000;
const RATE_LIMITS = {
  "/api/auth/login": 30,
  "/api/auth/register": 5,
  "/api/invite/verify": 20,
  "/api/account/email/request": 5,
  "/api/account/email/confirm": 10,
  "/api/auth/password-reset/request": 5,
  "/api/auth/password-reset/confirm": 10,
  "/media": 600,
  "/upload": 60,
  "/copy": 90,
  "/object": 90,
  default: 240,
};

const rateLimitBuckets = globalThis.__lifeVlogRateLimitBuckets || new Map();
globalThis.__lifeVlogRateLimitBuckets = rateLimitBuckets;
let emailSchemaPromise = null;



function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const configuredOrigins = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const normalizedOrigin = origin.replace(/\/$/, "");
  const allowedOrigin = !origin || configuredOrigins.includes(normalizedOrigin)
    ? origin || configuredOrigins[0] || "*"
    : "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanSegment(value, fallback = "file") {
  return String(value || fallback)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  return crypto.randomUUID();
}

function toBase64Url(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(String(value).length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256Base64Url(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toBase64Url(digest);
}

async function derivePasswordHash(password, salt, iterations = PASSWORD_HASH_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromBase64Url(salt),
      iterations,
    },
    key,
    256
  );
  return toBase64Url(bits);
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ""));
  const b = new TextEncoder().encode(String(right || ""));
  const length = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a[index] || 0) ^ (b[index] || 0);
  }
  return mismatch === 0;
}

async function hashPassword(password, salt = toBase64Url(crypto.getRandomValues(new Uint8Array(16)))) {
  const derived = await derivePasswordHash(password, salt);
  return {
    salt,
    hash: `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${derived}`,
  };
}

async function verifyPassword(password, salt, storedHash) {
  const value = String(storedHash || "");
  if (value.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const [, iterationsText, expected] = value.split("$");
    const iterations = Number(iterationsText);
    if (!Number.isInteger(iterations) || iterations < 10000 || !expected) {
      return { valid: false, needsUpgrade: false };
    }
    const actual = await derivePasswordHash(password, salt, iterations);
    return {
      valid: constantTimeEqual(actual, expected),
      needsUpgrade: iterations < PASSWORD_HASH_ITERATIONS,
    };
  }

  // Accounts created before this rollout used a single salted SHA-256.
  const legacy = await sha256Base64Url(`${salt}:${password}`);
  const valid = constantTimeEqual(legacy, value);
  return { valid, needsUpgrade: valid };
}

function safeJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function requireDb(request, env) {
  if (!env.DB) {
    return jsonResponse(
      request,
      env,
      { error: "D1 database is not bound yet. Add DB binding after creating life-vlog-db." },
      503
    );
  }
  return null;
}

function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function checkRateLimit(request, env, url) {
  if (request.method === "OPTIONS" || url.pathname === "/health" || url.pathname === "/api/d1/status") {
    return null;
  }
  const now = Date.now();
  const routeKey = url.pathname.startsWith("/media/") ? "/media" : url.pathname;
  const limit = RATE_LIMITS[routeKey] || RATE_LIMITS.default;
  const key = `${getClientIp(request)}:${routeKey}`;
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  current.count += 1;
  if (current.count > limit) {
    return jsonResponse(
      request,
      env,
      { error: "Too many requests. Please wait a moment and try again." },
      429
    );
  }
  if (rateLimitBuckets.size > 2000) {
    for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
  }
  return null;
}

async function getD1UserFromToken(token, env) {
  if (!env.DB) return null;
  if (!token) return null;
  await ensureEmailSchema(env);
  const tokenHash = await sha256Base64Url(token);
  const row = await env.DB.prepare(
    `select users.id, users.username, users.email,
            sessions.id as session_id, sessions.expires_at as session_expires_at
       from sessions
       join users on users.id = sessions.user_id
      where sessions.token_hash = ? and sessions.expires_at > ?`
  )
    .bind(tokenHash, nowIso())
    .first();
  if (!row?.id) return null;
  const expiresAt = new Date(row.session_expires_at || "").getTime();
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now() + SESSION_REFRESH_WINDOW_MS) {
    const renewedUntil = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
    await env.DB.prepare("update sessions set expires_at=? where id=?")
      .bind(renewedUntil, row.session_id)
      .run();
  }
  return { id: row.id, username: row.username, email: row.email || "", source: "d1" };
}

async function getD1UserFromSession(request, env) {
  return getD1UserFromToken(getBearerToken(request), env);
}

async function requireUserByToken(token, env) {
  return getD1UserFromToken(token, env);
}

async function requireUser(request, env) {
  return requireUserByToken(getBearerToken(request), env);
}

async function readJsonRequestBody(request) {
  const text = await request.text().catch(() => "");
  if (!text.trim()) badRequest("Request body must be valid JSON.");
  try {
    return JSON.parse(text);
  } catch {
    badRequest("Request body must be valid JSON.");
  }
}

function validateDiaryPhotoMedia(note) {
  const text = String(note || "");
  const startMarker = "<!--life-vlog-media:";
  const endMarker = "-->";
  const start = text.indexOf(startMarker);
  if (start === -1) return "";
  const payloadStart = start + startMarker.length;
  const end = text.indexOf(endMarker, payloadStart);
  if (end === -1) return "日记媒体数据不完整，请重新上传。";

  let media;
  try {
    media = JSON.parse(decodeURIComponent(text.slice(payloadStart, end)));
  } catch {
    return "日记媒体数据无法读取，请重新上传。";
  }
  if (!Array.isArray(media)) return "日记媒体数据格式不正确，请重新上传。";

  for (const [index, item] of media.entries()) {
    const type = String(
      item?.type || (item?.motion_url ? "live" : item?.video_url ? "video" : "image")
    ).toLowerCase();
    if (!["image", "live", "video"].includes(type)) {
      return `第 ${index + 1} 个媒体类型不受支持。`;
    }
    if (!item?.image_url) return `第 ${index + 1} 个媒体缺少封面图片。`;
    if (type === "live" && !item.motion_url) {
      return `第 ${index + 1} 个 Live Photo 缺少动态视频。`;
    }
    if (type === "video" && !item.video_url) {
      return `第 ${index + 1} 个普通视频缺少视频文件。`;
    }
    if (type === "image" && (item.motion_url || item.video_url)) {
      return `第 ${index + 1} 个媒体的类型与文件不一致。`;
    }
  }
  return "";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function generateEmailCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
}

function escapeEmailHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function ensureEmailSchema(env) {
  if (!env.DB) return;
  if (!emailSchemaPromise) {
    emailSchemaPromise = (async () => {
      try {
        await env.DB.prepare("alter table users add column email text").run();
      } catch (error) {
        if (!/duplicate column|already exists/i.test(String(error?.message || ""))) throw error;
      }
      await env.DB.prepare(
        "create unique index if not exists users_email_unique on users(email) where email is not null and email <> ''"
      ).run();
      await env.DB.prepare(
        `create table if not exists email_challenges (
          id text primary key,
          user_id text not null references users(id) on delete cascade,
          email text not null,
          purpose text not null check (purpose in ('bind', 'password_reset')),
          code_hash text not null,
          expires_at text not null,
          attempts integer not null default 0,
          created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )`
      ).run();
      await env.DB.prepare(
        "create index if not exists email_challenges_lookup_idx on email_challenges(user_id, email, purpose, created_at desc)"
      ).run();
    })().catch((error) => {
      emailSchemaPromise = null;
      throw error;
    });
  }
  return emailSchemaPromise;
}

async function sendTransactionalEmail(env, { to, subject, text, html }) {
  const apiKey = String(env.RESEND_API_KEY || "").trim();
  const from = String(env.EMAIL_FROM || "").trim();
  if (!apiKey || !from) throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Transactional email failed", response.status, result?.message || "");
    throw new Error("EMAIL_SEND_FAILED");
  }
  return result;
}

async function createEmailChallenge(env, { userId, email, purpose }) {
  const id = randomId();
  const code = generateEmailCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const codeHash = await sha256Base64Url(id + ":" + code);
  await env.DB.batch([
    env.DB.prepare("delete from email_challenges where user_id=? and email=? and purpose=?")
      .bind(userId, email, purpose),
    env.DB.prepare(
      "insert into email_challenges (id, user_id, email, purpose, code_hash, expires_at) values (?, ?, ?, ?, ?, ?)"
    ).bind(id, userId, email, purpose, codeHash, expiresAt),
  ]);
  return { id, code, expiresAt };
}

async function verifyEmailChallenge(env, { userId, email, purpose, code }) {
  const challenge = await env.DB.prepare(
    "select * from email_challenges where user_id=? and email=? and purpose=? order by created_at desc limit 1"
  )
    .bind(userId, email, purpose)
    .first();
  if (!challenge?.id) return { valid: false };
  if (new Date(challenge.expires_at).getTime() <= Date.now() || Number(challenge.attempts) >= 5) {
    await env.DB.prepare("delete from email_challenges where id=?").bind(challenge.id).run();
    return { valid: false };
  }
  const expected = await sha256Base64Url(challenge.id + ":" + String(code || "").trim());
  if (!constantTimeEqual(expected, challenge.code_hash)) {
    await env.DB.prepare("update email_challenges set attempts=attempts+1 where id=?")
      .bind(challenge.id)
      .run();
    return { valid: false };
  }
  return { valid: true, challenge };
}

async function deliverEmailChallenge(env, { email, code, purpose, username = "" }) {
  const isReset = purpose === "password_reset";
  const subject = isReset ? "咻蛋之家 · 找回账号" : "咻蛋之家 · 验证绑定邮箱";
  const usernameLine = username ? "你的用户名是：" + username + "\n\n" : "";
  const text =
    usernameLine +
    "验证码：" +
    code +
    "\n\n验证码 10 分钟内有效。如果不是你本人操作，请忽略这封邮件。";
  const safeCode = escapeEmailHtml(code);
  const safeUsername = escapeEmailHtml(username);
  const html =
    '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#172019">' +
    '<p style="color:#79bd4b;font-weight:700;letter-spacing:.08em">LIFE ARCHIVE</p>' +
    (safeUsername ? "<p>你的用户名是：<strong>" + safeUsername + "</strong></p>" : "") +
    '<p style="font-size:30px;font-weight:800;letter-spacing:.18em">' +
    safeCode +
    "</p>" +
    "<p>验证码 10 分钟内有效。如果不是你本人操作，请忽略这封邮件。</p></div>";
  return sendTransactionalEmail(env, { to: email, subject, text, html });
}

async function handleEmailBindRequest(request, env, user) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  await ensureEmailSchema(env);
  const payload = await readJsonRequestBody(request);
  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) return jsonResponse(request, env, { error: "请输入有效的邮箱地址。" }, 400);
  const existing = await env.DB.prepare(
    "select id from users where lower(email)=lower(?) and id<>?"
  ).bind(email, user.id).first();
  if (existing?.id) return jsonResponse(request, env, { error: "这个邮箱已经绑定了其他家庭账户。" }, 409);
  const challenge = await createEmailChallenge(env, { userId: user.id, email, purpose: "bind" });
  try {
    await deliverEmailChallenge(env, { email, code: challenge.code, purpose: "bind" });
  } catch (error) {
    await env.DB.prepare("delete from email_challenges where id=?").bind(challenge.id).run();
    const message =
      error?.message === "EMAIL_SERVICE_NOT_CONFIGURED"
        ? "邮箱服务尚未配置，请先在 Worker 中设置 RESEND_API_KEY 和 EMAIL_FROM。"
        : "验证码邮件发送失败，请稍后重试。";
    return jsonResponse(request, env, { error: message }, 503);
  }
  return jsonResponse(request, env, { data: { sent: true, email } });
}

async function handleEmailBindConfirm(request, env, user) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  await ensureEmailSchema(env);
  const payload = await readJsonRequestBody(request);
  const email = normalizeEmail(payload.email);
  const code = String(payload.code || "").trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return jsonResponse(request, env, { error: "邮箱或验证码格式不正确。" }, 400);
  }
  const verification = await verifyEmailChallenge(env, {
    userId: user.id,
    email,
    purpose: "bind",
    code,
  });
  if (!verification.valid) return jsonResponse(request, env, { error: "验证码错误或已过期。" }, 400);
  const existing = await env.DB.prepare(
    "select id from users where lower(email)=lower(?) and id<>?"
  ).bind(email, user.id).first();
  if (existing?.id) return jsonResponse(request, env, { error: "这个邮箱已经绑定了其他家庭账户。" }, 409);
  await env.DB.batch([
    env.DB.prepare("update users set email=?, updated_at=? where id=?").bind(email, nowIso(), user.id),
    env.DB.prepare("delete from email_challenges where id=?").bind(verification.challenge.id),
  ]);
  return jsonResponse(request, env, { data: { email } });
}

async function handlePasswordResetRequest(request, env) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  await ensureEmailSchema(env);
  const payload = await readJsonRequestBody(request);
  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) return jsonResponse(request, env, { error: "请输入有效的邮箱地址。" }, 400);
  const user = await env.DB.prepare(
    "select id, username from users where lower(email)=lower(?)"
  ).bind(email).first();
  if (!user?.id) return jsonResponse(request, env, { data: { sent: true } });
  const challenge = await createEmailChallenge(env, {
    userId: user.id,
    email,
    purpose: "password_reset",
  });
  try {
    await deliverEmailChallenge(env, {
      email,
      code: challenge.code,
      purpose: "password_reset",
      username: user.username,
    });
  } catch (error) {
    await env.DB.prepare("delete from email_challenges where id=?").bind(challenge.id).run();
    const message =
      error?.message === "EMAIL_SERVICE_NOT_CONFIGURED"
        ? "邮箱服务尚未配置，请先在 Worker 中设置 RESEND_API_KEY 和 EMAIL_FROM。"
        : "验证码邮件发送失败，请稍后重试。";
    return jsonResponse(request, env, { error: message }, 503);
  }
  return jsonResponse(request, env, { data: { sent: true } });
}

async function handlePasswordResetConfirm(request, env) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  await ensureEmailSchema(env);
  const payload = await readJsonRequestBody(request);
  const email = normalizeEmail(payload.email);
  const code = String(payload.code || "").trim();
  const password = String(payload.password || "");
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return jsonResponse(request, env, { error: "邮箱或验证码格式不正确。" }, 400);
  }
  if (password.length < 6 || password.length > 128) {
    return jsonResponse(request, env, { error: "密码需要为 6-128 个字符。" }, 400);
  }
  const user = await env.DB.prepare(
    "select id, username from users where lower(email)=lower(?)"
  ).bind(email).first();
  if (!user?.id) return jsonResponse(request, env, { error: "邮箱或验证码错误。" }, 400);
  const verification = await verifyEmailChallenge(env, {
    userId: user.id,
    email,
    purpose: "password_reset",
    code,
  });
  if (!verification.valid) return jsonResponse(request, env, { error: "验证码错误或已过期。" }, 400);
  const next = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare(
      "update users set password_hash=?, password_salt=?, updated_at=? where id=?"
    ).bind(next.hash, next.salt, nowIso(), user.id),
    env.DB.prepare("delete from sessions where user_id=?").bind(user.id),
    env.DB.prepare("delete from email_challenges where id=?").bind(verification.challenge.id),
  ]);
  return jsonResponse(request, env, { data: { username: user.username } });
}

function publicUrl(env, key) {
  return `${String(env.PUBLIC_R2_URL || "").replace(/\/+$/, "")}/${key}`;
}

function decodeMediaKey(pathname) {
  const parts = String(pathname || "")
    .replace(/^\/media\//, "")
    .split("/");
  if (parts.length < 3) return null;
  try {
    const scope = decodeURIComponent(parts.shift() || "");
    const key = parts.map((part) => decodeURIComponent(part)).join("/");
    if (!["family", "private"].includes(scope) || !key) return null;
    if (key.split("/").some((part) => !part || part === "." || part === "..")) return null;
    return { scope, key };
  } catch {
    return null;
  }
}

async function handleMedia(request, env, scope, key) {
  if (!env.R2_BUCKET) {
    return jsonResponse(request, env, { error: "R2 bucket is not configured." }, 503);
  }

  if (scope === "private") {
    const user = await requireUser(request, env);
    const ownerId = key.split("/")[0] || "";
    if (!user?.id) return jsonResponse(request, env, { error: "Unauthorized." }, 401);
    if (ownerId !== user.id) return jsonResponse(request, env, { error: "Not allowed." }, 403);
  }

  const object = await env.R2_BUCKET.get(key);
  if (!object) return jsonResponse(request, env, { error: "Image not found." }, 404);

  const headers = new Headers(getCorsHeaders(request, env));
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set(
    "Cache-Control",
    scope === "private" ? "private, no-store" : "public, max-age=31536000, immutable"
  );
  headers.set("X-Content-Type-Options", "nosniff");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}

async function handleUpload(request, env, user) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonResponse(request, env, { error: "Missing file." }, 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonResponse(request, env, { error: "文件不能超过 100 MB。" }, 413);
  }
  const fileType = String(file.type || "").toLowerCase();
  const isImage = fileType.startsWith("image/");
  const isLivePhotoMovie =
    fileType.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(file.name || "");
  if (!isImage && !isLivePhotoMovie) {
    return jsonResponse(request, env, { error: "Only image files or video files are allowed." }, 415);
  }

  const folder = cleanSegment(formData.get("folder"), "photos");
  const name = cleanSegment(formData.get("name"), "image");
  const random = crypto.randomUUID().slice(0, 8);
  const namedExtension = String(file.name || "").match(/\.([a-z0-9]{1,8})$/i)?.[1].toLowerCase() || "";
  const extension = isImage
    ? "jpg"
    : namedExtension ||
      (fileType === "video/mp4" ? "mp4" : fileType === "video/webm" ? "webm" : "mov");
  const key = `${user.id}/${folder}/${Date.now()}-${random}-${name}.${extension}`;
  const contentType = file.type || (isLivePhotoMovie ? "video/quicktime" : "image/jpeg");

  await env.R2_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      userId: user.id,
      originalName: file.name || "",
    },
  });

  return jsonResponse(request, env, {
    key,
    url: publicUrl(env, key),
    size: file.size,
    contentType,
  });
}

function isAllowedCopySource(value, env) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const publicHost = env.PUBLIC_R2_URL ? new URL(env.PUBLIC_R2_URL).host : "";
  const hostname = url.hostname.toLowerCase();
  const blockedHostname =
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  return url.protocol === "https:" && url.host !== publicHost && !blockedHostname;
}

async function fetchAllowedImage(sourceUrl, env) {
  let currentUrl = sourceUrl;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    if (!isAllowedCopySource(currentUrl, env)) throw new Error("Invalid source URL.");
    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; LifeVlogImageImporter/1.0)",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (!location || redirectCount === 3) throw new Error("Too many image redirects.");
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }
    return response;
  }
  throw new Error("Could not read source image.");
}

function detectImageContentType(bytes) {
  const view = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16));
  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) return "image/jpeg";
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) return "image/png";
  if (String.fromCharCode(...view.slice(0, 6)).startsWith("GIF8")) return "image/gif";
  if (
    String.fromCharCode(...view.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...view.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return "";
}

async function handleCopy(request, env, user) {
  const payload = await request.json().catch(() => ({}));
  const sourceUrl = String(payload.url || "");
  if (!isAllowedCopySource(sourceUrl, env)) {
    return jsonResponse(request, env, { error: "Invalid source URL." }, 400);
  }

  let response;
  try {
    response = await fetchAllowedImage(sourceUrl, env);
  } catch (error) {
    return jsonResponse(request, env, { error: error.message || "Invalid source URL." }, 400);
  }
  if (!response.ok || !response.body) {
    return jsonResponse(request, env, { error: "Could not read source image." }, 502);
  }

  let contentType = String(response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  const contentLength = Number(response.headers.get("Content-Length")) || 0;
  if (contentLength > MAX_UPLOAD_BYTES) {
    return jsonResponse(request, env, { error: "Source file is too large." }, 413);
  }

  const folder = cleanSegment(payload.folder, "migrated");
  const name = cleanSegment(payload.name, "image");
  const random = crypto.randomUUID().slice(0, 8);
  const key = `${user.id}/${folder}/${Date.now()}-${random}-${name}.jpg`;
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return jsonResponse(request, env, { error: "Source file is too large." }, 413);
  }
  if (!contentType.startsWith("image/")) contentType = detectImageContentType(bytes);
  if (!contentType) {
    return jsonResponse(request, env, { error: "The URL does not point to an image." }, 415);
  }

  await env.R2_BUCKET.put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      userId: user.id,
      copiedFrom: sourceUrl.slice(0, 500),
    },
  });

  return jsonResponse(request, env, {
    key,
    url: publicUrl(env, key),
    size: bytes.byteLength,
    contentType,
  });
}

async function handleD1Register(request, env) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  await ensureEmailSchema(env);
  const payload = await request.json().catch(() => ({}));
  const configuredInvite = String(env.FAMILY_INVITE_CODE || "").trim();
  const inviteCode = String(payload.invite_code || payload.inviteCode || "").trim();
  if (!configuredInvite || inviteCode !== configuredInvite) {
    return jsonResponse(
      request,
      env,
      { error: "Invite code is required. Ask xiudan320 for an invite." },
      403
    );
  }
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  if (!/^[\w.-]{2,48}$/i.test(username)) {
    return jsonResponse(request, env, { error: "Username must be 2-48 letters, numbers, dots or dashes." }, 400);
  }
  if (password.length < 6 || password.length > 128) {
    return jsonResponse(request, env, { error: "Password must be 6-128 characters." }, 400);
  }

  const exists = await env.DB.prepare("select id from users where lower(username)=lower(?)")
    .bind(username)
    .first();
  if (exists) return jsonResponse(request, env, { error: "Username already exists." }, 409);

  const userId = randomId();
  const { salt, hash } = await hashPassword(password);
  const isOwner = username.toLowerCase() === "xiao980320";
  const rechargeTotal = isOwner ? 298 : 0;
  const vipLevel = isOwner ? 5 : 0;
  await env.DB.batch([
    env.DB.prepare(
      "insert into users (id, username, password_hash, password_salt) values (?, ?, ?, ?)"
    ).bind(userId, username, hash, salt),
    env.DB.prepare(
      `insert into user_profiles
       (user_id, username, recharge_total, vip_level, home_name)
       values (?, ?, ?, ?, ?)`
    ).bind(userId, username, rechargeTotal, vipLevel, "咻蛋之家"),
  ]);

  return await handleD1Login(request, env, { username, password });
}

async function handleInviteVerify(request, env) {
  const payload = await request.json().catch(() => ({}));
  const configuredInvite = String(env.FAMILY_INVITE_CODE || "").trim();
  const inviteCode = String(payload.invite_code || payload.inviteCode || "").trim();
  if (!configuredInvite || inviteCode !== configuredInvite) {
    return jsonResponse(request, env, { ok: false, error: "邀请码不正确。" }, 403);
  }
  return jsonResponse(request, env, { ok: true });
}

async function handleSignupInviteRead(request, env, user) {
  if (!(await requireFamilyOwner(env, user))) {
    return jsonResponse(request, env, { error: "Only the family owner can read the signup invite." }, 403);
  }
  const code = String(env.FAMILY_INVITE_CODE || "").trim();
  if (!code) {
    return jsonResponse(request, env, { error: "FAMILY_INVITE_CODE is not configured." }, 503);
  }
  return jsonResponse(request, env, { data: { code } });
}

async function handleD1Login(request, env, directPayload = null) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  await ensureEmailSchema(env);
  const payload = directPayload || (await request.json().catch(() => ({})));
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  const user = await env.DB.prepare("select * from users where lower(username)=lower(?)")
    .bind(username)
    .first();
  if (!user) return jsonResponse(request, env, { error: "Invalid login credentials." }, 401);

  const verification = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!verification.valid) {
    return jsonResponse(request, env, { error: "Invalid login credentials." }, 401);
  }
  // Legacy accounts are still valid. Rehashing them inline can exceed the
  // Worker CPU budget and turn a successful password check into a 500 login.
  // They will move to PBKDF2 the next time the user explicitly changes the
  // password, outside this latency-sensitive login path.

  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toBase64Url(tokenBytes);
  const tokenHash = await sha256Base64Url(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  await env.DB.prepare(
    "insert into sessions (id, user_id, token_hash, expires_at) values (?, ?, ?, ?)"
  )
    .bind(randomId(), user.id, tokenHash, expiresAt)
    .run();

  const profile = await env.DB.prepare("select * from user_profiles where user_id=?")
    .bind(user.id)
    .first();
  return jsonResponse(request, env, {
    token,
    expires_at: expiresAt,
    user: { id: user.id, username: user.username, email: user.email || "" },
    profile,
  });
}

async function handleD1Me(request, env, user) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const profile = await env.DB.prepare("select * from user_profiles where user_id=?")
    .bind(user.id)
    .first();
  const family = await getFamilyContext(env, user.id);
  return jsonResponse(request, env, { user, profile, family });
}

const RECYCLABLE_FAMILY_ITEMS = {
  wish: { table: "wishes", labelColumn: "title" },
  recipe: { table: "recipes", labelColumn: "name" },
  weekend: { table: "weekend_plans", labelColumn: "title" },
  anniversary: { table: "anniversaries", labelColumn: "title" },
  gratitude: { table: "gratitude_notes", labelColumn: "body" },
};

async function moveFamilyItemToTrash(request, env, user, payload) {
  const itemType = String(payload.p_item_type || payload.item_type || "").trim();
  const itemId = String(payload.p_item_id || payload.item_id || "").trim();
  const recycleConfig = RECYCLABLE_FAMILY_ITEMS[itemType];
  if (!recycleConfig || !itemId) {
    return jsonResponse(request, env, { error: "Invalid recycle-bin request." }, 400);
  }

  const tableConfig = TABLE_CONFIG[recycleConfig.table];
  const filters = [{ op: "eq", column: "id", value: itemId }];
  const values = [];
  const scope = await buildScopeSql(env, recycleConfig.table, tableConfig, user, values, true, getFamilyUserIds);
  const clauses = [...scope, ...buildFilterSql(tableConfig, filters, values)];
  const row = await env.DB.prepare(
    `select * from ${recycleConfig.table} where ${clauses.join(" and ")} limit 1`
  )
    .bind(...values)
    .first();
  if (!row) {
    return jsonResponse(request, env, { error: "Item not found or not writable." }, 404);
  }

  const trashId = randomId();
  const deletedAt = new Date();
  const expiresAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const label = String(row[recycleConfig.labelColumn] || "").slice(0, 120);
  const storedPayload = JSON.stringify(denormalizeRow(recycleConfig.table, row));
  const deleteValues = [];
  const deleteScope = await buildScopeSql(
    env,
    recycleConfig.table,
    tableConfig,
    user,
    deleteValues,
    true,
    getFamilyUserIds
  );
  const deleteClauses = [
    ...deleteScope,
    ...buildFilterSql(tableConfig, filters, deleteValues),
  ];

  await env.DB.batch([
    env.DB.prepare(
      `insert into trash_items
        (id, user_id, item_type, item_id, label, payload, deleted_at, expires_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      trashId,
      user.id,
      itemType,
      itemId,
      label,
      storedPayload,
      deletedAt.toISOString(),
      expiresAt.toISOString()
    ),
    env.DB.prepare(
      `delete from ${recycleConfig.table} where ${deleteClauses.join(" and ")}`
    ).bind(...deleteValues),
  ]);

  return jsonResponse(request, env, {
    data: { id: itemId, trash_id: trashId, deleted_at: deletedAt.toISOString() },
  });
}

const RESTORABLE_TRASH_TABLES = Object.freeze({
  photo: "photos",
  secret: "secret_items",
  recipe: "recipes",
  wish: "wishes",
  weekend: "weekend_plans",
  anniversary: "anniversaries",
  gratitude: "gratitude_notes",
});

function parseTrashPayload(row) {
  if (row?.payload && typeof row.payload === "object") return row.payload;
  const payload = safeJson(row?.payload, {});
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

async function getAccessibleTrashItem(env, user, trashId) {
  const row = await env.DB.prepare("select * from trash_items where id=? limit 1")
    .bind(trashId)
    .first();
  if (!row) return { error: "回收站记录不存在。", status: 404 };

  const payload = parseTrashPayload(row);
  const ownerId = String(payload.user_id || row.user_id || "");
  const familyUserIds = await getFamilyUserIds(env, user.id);
  const familySet = new Set(familyUserIds.map((id) => String(id)));
  const isSecret = row.item_type === "secret";
  const canAccess = isSecret
    ? ownerId === String(user.id)
    : familySet.has(String(row.user_id)) || familySet.has(ownerId);
  if (!canAccess) return { error: "无权访问这条回收站记录。", status: 403 };

  return { row, payload, ownerId, familyUserIds };
}

async function listTrashItems(request, env, user, payload) {
  const familyUserIds = await getFamilyUserIds(env, user.id);
  const placeholders = familyUserIds.map(() => "?").join(",");
  const limit = Math.min(500, Math.max(1, Number(payload.p_limit || payload.limit || 200)));
  const rows = await env.DB.prepare(
    `select trash_items.*,
            deleted_profiles.username as deleted_by_username,
            owner_profiles.username as owner_username
       from trash_items
       left join user_profiles deleted_profiles
         on deleted_profiles.user_id = trash_items.user_id
       left join user_profiles owner_profiles
         on owner_profiles.user_id = coalesce(json_extract(trash_items.payload, '$.user_id'), trash_items.user_id)
      where trash_items.expires_at > ?
        and (
          (trash_items.item_type = 'secret'
            and coalesce(json_extract(trash_items.payload, '$.user_id'), trash_items.user_id) = ?)
          or
          (trash_items.item_type <> 'secret'
            and (
              trash_items.user_id in (${placeholders})
              or coalesce(json_extract(trash_items.payload, '$.user_id'), trash_items.user_id) in (${placeholders})
            ))
        )
      order by trash_items.deleted_at desc
      limit ?`
  )
    .bind(
      nowIso(),
      user.id,
      ...familyUserIds,
      ...familyUserIds,
      limit
    )
    .all();

  return jsonResponse(request, env, {
    data: (rows.results || []).map((row) => ({
      ...denormalizeRow("trash_items", row),
      deleted_by_username: row.deleted_by_username || "",
      owner_username: row.owner_username || "",
    })),
  });
}

function normalizeRestoredPhotoComments(sourcePayload, photoId) {
  if (!Array.isArray(sourcePayload?.comments)) return [];
  const seen = new Set();
  const comments = sourcePayload.comments
    .map((comment) => ({
      id: String(comment?.id || "").trim(),
      photo_id: photoId,
      user_id: String(comment?.user_id || "").trim(),
      parent_id: String(comment?.parent_id || "").trim() || null,
      body: String(comment?.body || ""),
      created_at: String(comment?.created_at || nowIso()),
      updated_at: String(comment?.updated_at || comment?.created_at || nowIso()),
    }))
    .filter((comment) => {
      if (!comment.id || !comment.user_id || !comment.body || seen.has(comment.id)) return false;
      seen.add(comment.id);
      return true;
    });

  const ids = new Set(comments.map((comment) => comment.id));
  comments.forEach((comment) => {
    if (comment.parent_id && !ids.has(comment.parent_id)) comment.parent_id = null;
  });

  const ordered = [];
  const pending = [...comments];
  const inserted = new Set();
  while (pending.length) {
    const index = pending.findIndex((comment) => !comment.parent_id || inserted.has(comment.parent_id));
    if (index < 0) {
      ordered.push(...pending.map((comment) => ({ ...comment, parent_id: null })));
      break;
    }
    const [comment] = pending.splice(index, 1);
    ordered.push(comment);
    inserted.add(comment.id);
  }
  return ordered;
}

async function restoreTrashItem(request, env, user, payload) {
  const trashId = String(payload.p_trash_id || payload.trash_id || payload.id || "").trim();
  if (!trashId) return jsonResponse(request, env, { error: "缺少回收站记录。" }, 400);
  const accessible = await getAccessibleTrashItem(env, user, trashId);
  if (accessible.error) return jsonResponse(request, env, { error: accessible.error }, accessible.status);

  const { row, payload: sourcePayload, ownerId } = accessible;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return jsonResponse(request, env, { error: "这条记录已过期，无法恢复。" }, 410);
  }
  const table = RESTORABLE_TRASH_TABLES[row.item_type];
  const tableConfig = TABLE_CONFIG[table];
  if (!table || !tableConfig) {
    return jsonResponse(request, env, { error: "不支持恢复这类记录。" }, 400);
  }

  const itemId = String(sourcePayload.id || row.item_id || "").trim();
  if (!itemId) return jsonResponse(request, env, { error: "原记录缺少 ID，无法恢复。" }, 400);
  const existing = await env.DB.prepare(`select id from ${table} where id=? limit 1`)
    .bind(itemId)
    .first();
  if (existing) return jsonResponse(request, env, { error: "内容已存在，未重复恢复。" }, 409);

  sourcePayload.id = itemId;
  if (tableConfig.ownerColumn) sourcePayload[tableConfig.ownerColumn] = ownerId;
  const restored = sanitizeRowForTable(table, sourcePayload, user, { forceOwner: false });
  restored.id = itemId;
  if (tableConfig.ownerColumn) restored[tableConfig.ownerColumn] = ownerId;
  for (const column of ["created_at", "updated_at"]) {
    if (Object.prototype.hasOwnProperty.call(sourcePayload, column)) {
      restored[column] = normalizeColumnValue(table, column, sourcePayload[column]);
    }
  }

  const columns = tableConfig.columns.filter((column) =>
    Object.prototype.hasOwnProperty.call(restored, column)
  );
  const placeholders = columns.map(() => "?").join(",");
  const statements = [
    env.DB.prepare(
      `insert into ${table} (${columns.join(",")}) values (${placeholders})`
    ).bind(...columns.map((column) => restored[column])),
  ];

  if (table === "photos") {
    const comments = normalizeRestoredPhotoComments(sourcePayload, itemId);
    for (const comment of comments) {
      statements.push(
        env.DB.prepare(
          `insert into photo_comments (id, photo_id, user_id, parent_id, body, created_at, updated_at)
           values (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          comment.id,
          comment.photo_id,
          comment.user_id,
          comment.parent_id,
          comment.body,
          comment.created_at,
          comment.updated_at
        )
      );
    }
  }

  statements.push(env.DB.prepare("delete from trash_items where id=?").bind(trashId));
  await env.DB.batch(statements);

  return jsonResponse(request, env, { data: { id: itemId, item_type: row.item_type } });
}

async function permanentlyDeleteTrashItem(request, env, user, payload) {
  const trashId = String(payload.p_trash_id || payload.trash_id || payload.id || "").trim();
  if (!trashId) return jsonResponse(request, env, { error: "缺少回收站记录。" }, 400);
  const accessible = await getAccessibleTrashItem(env, user, trashId);
  if (accessible.error) return jsonResponse(request, env, { error: accessible.error }, accessible.status);
  await env.DB.prepare("delete from trash_items where id=?").bind(trashId).run();
  return jsonResponse(request, env, { data: true });
}

async function adminDeletePhoto(request, env, user, payload) {
  if (!(await isFamilyAdministrator(env, user))) {
    return jsonResponse(request, env, { error: "Only the family administrator can delete diaries." }, 403);
  }
  const photoId = String(payload.p_photo_id || payload.photo_id || "").trim();
  if (!photoId) return jsonResponse(request, env, { error: "Photo ID is required." }, 400);

  const familyUserIds = await getFamilyUserIds(env, user.id);
  const placeholders = familyUserIds.map(() => "?").join(",");
  const target = await env.DB.prepare(
    `select * from photos where id=? and user_id in (${placeholders}) limit 1`
  )
    .bind(photoId, ...familyUserIds)
    .first();
  if (!target) return jsonResponse(request, env, { data: [] });

  await env.DB.prepare(
    `delete from photos where id=? and user_id in (${placeholders})`
  )
    .bind(photoId, ...familyUserIds)
    .run();
  return jsonResponse(request, env, {
    data: [denormalizeRow("photos", target)],
  });
}

async function handleRpc(request, env, user, name) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const payload = request.method === "GET" ? {} : await readJsonRequestBody(request);

  if (name === "move_family_item_to_trash") {
    return moveFamilyItemToTrash(request, env, user, payload);
  }

  if (name === "list_trash_items") {
    return listTrashItems(request, env, user, payload);
  }

  if (name === "restore_trash_item") {
    return restoreTrashItem(request, env, user, payload);
  }

  if (name === "permanently_delete_trash_item") {
    return permanentlyDeleteTrashItem(request, env, user, payload);
  }

  if (name === "admin_delete_photo") {
    return adminDeletePhoto(request, env, user, payload);
  }

  if (name === "get_my_family_members") {
    const family = await getFamilyContext(env, user.id);
    return jsonResponse(request, env, {
      data: family
        ? family.members.map((member) => ({
            ...member,
            family_id: family.id,
            family_name: family.name,
            family_tagline: family.tagline || "",
          }))
        : [],
    });
  }

  if (name === "get_my_family_invitations") {
    const rows = await env.DB.prepare(
      `select family_invitations.id as invitation_id,
              family_invitations.status,
              family_invitations.invited_user_id,
              family_invitations.invited_by,
              families.id as family_id,
              families.name as family_name,
              inviter.username as inviter_username,
              invited.username as invited_username
         from family_invitations
         join families on families.id = family_invitations.family_id
         left join user_profiles inviter on inviter.user_id = family_invitations.invited_by
         left join user_profiles invited on invited.user_id = family_invitations.invited_user_id
        where family_invitations.status = 'pending'
          and (family_invitations.invited_user_id = ? or family_invitations.invited_by = ?)
        order by family_invitations.created_at desc`
    )
      .bind(user.id, user.id)
      .all();
    return jsonResponse(request, env, {
      data: (rows.results || []).map((row) => ({
        ...row,
        is_incoming: row.invited_user_id === user.id,
      })),
    });
  }

  if (name === "create_family") {
    const existing = await getFamilyContext(env, user.id);
    if (existing) return jsonResponse(request, env, { data: true });
    const familyId = randomId();
    const familyName = String(payload.p_name || payload.name || "我们的家").trim() || "我们的家";
    await env.DB.batch([
      env.DB.prepare("insert into families (id, name, owner_id) values (?, ?, ?)")
        .bind(familyId, familyName, user.id),
      env.DB.prepare("insert into family_members (family_id, user_id, role) values (?, ?, 'owner')")
        .bind(familyId, user.id),
    ]);
    return jsonResponse(request, env, { data: true });
  }

  if (name === "add_family_member_by_username") {
    const family = await getFamilyContext(env, user.id);
    if (!family || family.owner_id !== user.id) {
      return jsonResponse(request, env, { error: "Only the family owner can invite members." }, 403);
    }
    const username = String(payload.p_username || payload.username || "").trim();
    const invited = await env.DB.prepare("select id, username from users where lower(username)=lower(?)")
      .bind(username)
      .first();
    if (!invited?.id) return jsonResponse(request, env, { error: "User not found." }, 404);
    await env.DB.prepare(
      `insert into family_invitations (id, family_id, invited_user_id, invited_by, status)
       values (?, ?, ?, ?, 'pending')
       on conflict(family_id, invited_user_id) where status = 'pending'
       do update set invited_by=excluded.invited_by`
    )
      .bind(randomId(), family.id, invited.id, user.id)
      .run();
    return jsonResponse(request, env, { data: true });
  }

  if (name === "respond_family_invitation") {
    const invitationId = String(payload.p_invitation_id || payload.invitation_id || "");
    const accept = Boolean(payload.p_accept ?? payload.accept);
    const invitation = await env.DB.prepare("select * from family_invitations where id=? and invited_user_id=?")
      .bind(invitationId, user.id)
      .first();
    if (!invitation) return jsonResponse(request, env, { error: "Invitation not found." }, 404);
    await env.DB.prepare(
      "update family_invitations set status=?, responded_at=? where id=?"
    )
      .bind(accept ? "accepted" : "declined", nowIso(), invitationId)
      .run();
    if (accept) {
      await env.DB.prepare(
        "insert or ignore into family_members (family_id, user_id, role) values (?, ?, 'member')"
      )
        .bind(invitation.family_id, user.id)
        .run();
    }
    return jsonResponse(request, env, { data: true });
  }

  if (name === "remove_family_member") {
    const targetUserId = String(payload.p_user_id || payload.user_id || "");
    const family = await getFamilyContext(env, user.id);
    if (!family || family.owner_id !== user.id) {
      return jsonResponse(request, env, { error: "Only the family owner can remove members." }, 403);
    }
    await env.DB.prepare("delete from family_members where family_id=? and user_id=? and role<>'owner'")
      .bind(family.id, targetUserId)
      .run();
    return jsonResponse(request, env, { data: true });
  }

  if (name === "update_family_tagline") {
    const family = await getFamilyContext(env, user.id);
    if (!family) return jsonResponse(request, env, { error: "Family not found." }, 404);
    const tagline = String(payload.p_tagline || payload.tagline || "").trim().slice(0, 120);
    if (!tagline) return jsonResponse(request, env, { error: "Tagline is required." }, 400);
    await env.DB.prepare("update families set tagline=? where id=?")
      .bind(tagline, family.id)
      .run();
    return jsonResponse(request, env, { data: { tagline } });
  }

  if (name === "update_family_name") {
    const family = await getFamilyContext(env, user.id);
    if (!family) return jsonResponse(request, env, { error: "Family not found." }, 404);
    const familyName = String(payload.p_name || payload.name || "").trim().slice(0, 24);
    if (!familyName) return jsonResponse(request, env, { error: "Family name is required." }, 400);
    await env.DB.prepare("update families set name=? where id=?")
      .bind(familyName, family.id)
      .run();
    return jsonResponse(request, env, { data: { name: familyName } });
  }

  if (name === "admin_update_photo_category") {
    if (String(user.username || "").trim().toLowerCase() !== "xiudan320") {
      return jsonResponse(request, env, { error: "Only the family administrator can change this category." }, 403);
    }
    const photoId = String(payload.p_photo_id || payload.photo_id || "").trim();
    const category = String(payload.p_category || payload.category || "").trim().slice(0, 32);
    if (!photoId || !category) {
      return jsonResponse(request, env, { error: "Photo and category are required." }, 400);
    }
    const familyIds = await getFamilyUserIds(env, user.id);
    const placeholders = familyIds.map(() => "?").join(",");
    const target = await env.DB.prepare(
      `select id from photos where id=? and user_id in (${placeholders}) limit 1`
    ).bind(photoId, ...familyIds).first();
    if (!target) return jsonResponse(request, env, { error: "Diary not found in this family." }, 404);
    await env.DB.prepare("update photos set category=?, updated_at=? where id=?")
      .bind(category, nowIso(), photoId)
      .run();
    return jsonResponse(request, env, { data: { id: photoId, category } });
  }

  if (name === "get_my_notifications") {
    const limit = Math.min(100, Math.max(1, Number(payload.p_limit || 50)));
    const rows = await env.DB.prepare(
      `select notifications.*,
              user_profiles.username as actor_username,
              user_profiles.avatar_url as actor_avatar_url,
              user_profiles.avatar_path as actor_avatar_path,
              photos.image_url as photo_image_url
         from notifications
         left join user_profiles on user_profiles.user_id = notifications.actor_id
         left join photos on photos.id = notifications.photo_id
        where notifications.user_id=?
        order by notifications.created_at desc
        limit ?`
    )
      .bind(user.id, limit)
      .all();
    return jsonResponse(request, env, {
      data: (rows.results || []).map((row) => ({
        ...denormalizeRow("notifications", row),
        notification_id: row.id,
        actor_username: row.actor_username || "",
        actor_avatar_url: row.actor_avatar_url || "",
        actor_avatar_path: row.actor_avatar_path || "",
        photo_image_url: row.photo_image_url || "",
      })),
    });
  }

  if (name === "set_password_recovery_key") {
    const recoveryKey = String(payload.p_recovery_key || payload.recovery_key || "");
    if (recoveryKey.length < 12) {
      return jsonResponse(request, env, { error: "Recovery key is too short." }, 400);
    }
    const { salt, hash } = await hashPassword(recoveryKey);
    await env.DB.prepare(
      `insert into password_recovery_credentials (user_id, recovery_hash, recovery_salt, updated_at)
       values (?, ?, ?, ?)
       on conflict(user_id) do update set
         recovery_hash=excluded.recovery_hash,
         recovery_salt=excluded.recovery_salt,
         updated_at=excluded.updated_at`
    )
      .bind(user.id, hash, salt, nowIso())
      .run();
    return jsonResponse(request, env, { data: true });
  }

  return jsonResponse(request, env, { error: "Unknown RPC." }, 404);
}

async function handlePasswordRecoveryReset(request, env) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const payload = await readJsonRequestBody(request);
  const username = String(payload.p_username || payload.username || "").trim();
  const recoveryKey = String(payload.p_recovery_key || payload.recovery_key || "");
  const newPassword = String(payload.p_new_password || payload.new_password || "");
  const user = await env.DB.prepare("select * from users where lower(username)=lower(?)")
    .bind(username)
    .first();
  if (!user?.id || newPassword.length < 6) return jsonResponse(request, env, { data: false });
  const credential = await env.DB.prepare("select * from password_recovery_credentials where user_id=?")
    .bind(user.id)
    .first();
  if (!credential) return jsonResponse(request, env, { data: false });
  const verification = await verifyPassword(
    recoveryKey,
    credential.recovery_salt,
    credential.recovery_hash
  );
  if (!verification.valid) return jsonResponse(request, env, { data: false });
  if (verification.needsUpgrade) {
    const upgradedRecovery = await hashPassword(recoveryKey);
    await env.DB.prepare(
      "update password_recovery_credentials set recovery_hash=?, recovery_salt=?, updated_at=? where user_id=?"
    )
      .bind(upgradedRecovery.hash, upgradedRecovery.salt, nowIso(), user.id)
      .run();
  }
  const next = await hashPassword(newPassword);
  await env.DB.batch([
    env.DB.prepare(
      "update users set password_hash=?, password_salt=?, updated_at=? where id=?"
    ).bind(next.hash, next.salt, nowIso(), user.id),
    env.DB.prepare("delete from sessions where user_id=?").bind(user.id),
  ]);
  return jsonResponse(request, env, { data: true });
}

async function handlePasswordUpdate(request, env, user) {
  const payload = await readJsonRequestBody(request);
  const password = String(payload.password || "");
  if (password.length < 6 || password.length > 128) {
    return jsonResponse(request, env, { error: "Password must be 6-128 characters." }, 400);
  }
  const next = await hashPassword(password);
  const currentTokenHash = await sha256Base64Url(getBearerToken(request));
  await env.DB.batch([
    env.DB.prepare("update users set password_hash=?, password_salt=?, updated_at=? where id=?")
      .bind(next.hash, next.salt, nowIso(), user.id),
    env.DB.prepare("delete from sessions where user_id=? and token_hash<>?")
      .bind(user.id, currentTokenHash),
  ]);
  return jsonResponse(request, env, { data: true });
}

async function getFamilyIds(env, userId) {
  const rows = await env.DB.prepare("select family_id from family_members where user_id=?")
    .bind(userId)
    .all();
  return (rows.results || []).map((row) => row.family_id);
}

async function getFamilyUserIds(env, userId) {
  const familyIds = await getFamilyIds(env, userId);
  if (!familyIds.length) return [userId];
  const placeholders = familyIds.map(() => "?").join(",");
  const rows = await env.DB.prepare(
    `select distinct user_id from family_members where family_id in (${placeholders})`
  )
    .bind(...familyIds)
    .all();
  return [...new Set([userId, ...(rows.results || []).map((row) => row.user_id)])];
}

async function getFamilyContext(env, userId) {
  const family = await env.DB.prepare(
    `select families.* from families
      join family_members on family_members.family_id = families.id
     where family_members.user_id = ?
     limit 1`
  )
    .bind(userId)
    .first();
  if (!family) return null;
  const members = await env.DB.prepare(
    `select family_members.*, user_profiles.username, user_profiles.avatar_url, user_profiles.avatar_path
       from family_members
      left join user_profiles on user_profiles.user_id = family_members.user_id
      where family_members.family_id = ?
      order by case when family_members.role='owner' then 0 else 1 end, joined_at asc`
  )
    .bind(family.id)
    .all();
  return { ...family, members: members.results || [] };
}

async function isFamilyOwner(env, userId) {
  const family = await getFamilyContext(env, userId);
  return Boolean(family?.owner_id && String(family.owner_id) === String(userId));
}

async function isFamilyAdministrator(env, user) {
  const namedAdmin = String(user?.username || "").trim().toLowerCase() === "xiudan320";
  return namedAdmin || (Boolean(user?.id) && await isFamilyOwner(env, user.id));
}

async function getR2StorageUsage(env) {
  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  let usedBytes = 0;
  let monthUploadedBytes = 0;
  let cursor;
  do {
    const listed = await env.R2_BUCKET.list({ limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const object of listed.objects || []) {
      const size = Math.max(0, Number(object.size) || 0);
      usedBytes += size;
      const uploadedAt = new Date(object.uploaded).getTime();
      if (Number.isFinite(uploadedAt) && uploadedAt >= monthStart) {
        monthUploadedBytes += size;
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return { usedBytes, monthUploadedBytes };
}

async function handleAdminR2Usage(request, env, user) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const namedAdmin = String(user.username || "").trim().toLowerCase() === "xiudan320";
  if (!namedAdmin && !(await isFamilyOwner(env, user.id))) {
    return jsonResponse(request, env, { error: "Only the family administrator can read R2 usage." }, 403);
  }
  const { usedBytes, monthUploadedBytes } = await getR2StorageUsage(env);
  return jsonResponse(request, env, {
    data: {
      used_bytes: usedBytes,
      month_uploaded_bytes: monthUploadedBytes,
      capacity_label: "不限",
      refreshed_at: nowIso(),
    },
  });
}

async function handleAdminR2Audit(request, env, user) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const namedAdmin = String(user.username || "").trim().toLowerCase() === "xiudan320";
  if (!namedAdmin && !(await isFamilyOwner(env, user.id))) {
    return jsonResponse(request, env, { error: "Only the family administrator can audit R2 objects." }, 403);
  }
  return jsonResponse(request, env, { data: await auditR2Objects(env) });
}

function getPushCopy(type, actorName, body = "", aggregateCount = 1) {
  const name = actorName || "家庭成员";
  const count = Math.max(1, Number(aggregateCount) || 1);
  const snippets = {
    diary: [`${name} 发布了新日记`, body || "家里有一条新的生活记录"],
    thanks: [`${name} 写下了感谢留言`, body || "感谢留言板有了新内容"],
    comment: [`${name} 评论了你的日记${count > 1 ? ` ${count} 次` : ""}`, body || "打开看看对方说了什么"],
    reply: [`${name} 回复了你${count > 1 ? ` ${count} 次` : ""}`, body || "你收到了一条新回复"],
    favorite: [`${name} 收藏了你的日记`, "你的记录被家人收藏了"],
    wish: [`${name} 新增了一条心愿`, body || "打开看看家人想要什么"],
    shopping: [`${name} 添加了购物车商品`, body || "打开看看家人准备买什么"],
    mood_reminder: ["今天还没有记录心情", body || "点开咻蛋之家，补上今天的心情吧"],
    push_ready: ["通知已开启", "以后家人发布新日记、心愿、购物车商品或留言时，这台设备会收到提醒"],
  };
  return snippets[type] || [`${name} 有新动态`, body || "打开咻蛋之家查看"];
}

async function sendPushToUser(env, userId, notification) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !userId) return;
  const subscriptions = await env.DB.prepare(
    "select id, endpoint, p256dh, auth from push_subscriptions where user_id=?"
  ).bind(userId).all();
  if (!(subscriptions.results || []).length) return;
  const actor = await env.DB.prepare(
    "select username from user_profiles where user_id=? limit 1"
  ).bind(notification.actorId).first();
  const unread = await env.DB.prepare(
    "select count(*) as total from notifications where user_id=? and is_read=0"
  ).bind(userId).first();
  let aggregateCount = 1;
  if (["comment", "reply"].includes(notification.type) && notification.photoId) {
    const recent = await env.DB.prepare(
      `select count(*) as total from notifications
       where user_id=? and actor_id=? and type=? and photo_id=? and is_read=0
         and datetime(created_at) >= datetime('now', '-10 minutes')`
    ).bind(userId, notification.actorId, notification.type, notification.photoId).first();
    aggregateCount = Math.max(1, Number(recent?.total || 1));
  }
  const [title, body] = getPushCopy(notification.type, actor?.username, notification.body, aggregateCount);
  const data = {
    title,
    body: String(body || "").slice(0, 180),
    icon: "/assets/generated/app-icon-192.png",
    badge: "/assets/generated/app-icon-192.png",
    tag: `life-vlog-${notification.type}-${notification.photoId || notification.id}`,
    notificationId: notification.id,
    photoId: notification.photoId || "",
    type: notification.type,
    aggregateCount,
    unread: Number(unread?.total || 1),
    url: notification.photoId
      ? `/?pushPhoto=${encodeURIComponent(notification.photoId)}`
      : `/?pushType=${encodeURIComponent(notification.type)}`,
  };
  const vapid = {
    subject: env.VAPID_SUBJECT || "mailto:xiudan320@gmail.com",
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
  await Promise.allSettled((subscriptions.results || []).map(async (subscription) => {
    try {
      const request = await buildPushPayload(
        { data, options: { ttl: 86400, urgency: "normal", topic: `life-vlog-${notification.type}` } },
        {
          endpoint: subscription.endpoint,
          expirationTime: null,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        vapid
      );
      const response = await fetch(subscription.endpoint, request);
      if (response.status === 404 || response.status === 410) {
        await env.DB.prepare("delete from push_subscriptions where id=?").bind(subscription.id).run();
      } else if (!response.ok) {
        console.warn("Push delivery rejected", {
          userId,
          status: response.status,
          type: notification.type,
        });
      } else {
        await env.DB.prepare("update push_subscriptions set last_seen_at=? where id=?")
          .bind(nowIso(), subscription.id)
          .run();
      }
    } catch (error) {
      // A single unavailable device must not block publishing content.
      console.warn("Push delivery failed", {
        userId,
        type: notification.type,
        error: String(error?.message || error),
      });
    }
  }));
}

async function handlePushSubscribe(request, env, user) {
  const payload = await readJsonRequestBody(request);
  const subscription = payload.subscription || payload;
  const endpoint = String(subscription?.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();
  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return jsonResponse(request, env, { error: "Invalid push subscription." }, 400);
  }
  const existing = await env.DB.prepare("select id from push_subscriptions where endpoint=?").bind(endpoint).first();
  const id = existing?.id || randomId();
  await env.DB.prepare(
    `insert into push_subscriptions (id,user_id,endpoint,p256dh,auth,user_agent,created_at,updated_at,last_seen_at)
     values (?,?,?,?,?,?,?,?,?)
     on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,
       user_agent=excluded.user_agent,updated_at=excluded.updated_at,last_seen_at=excluded.last_seen_at`
  ).bind(
    id, user.id, endpoint, p256dh, auth,
    String(request.headers.get("User-Agent") || "").slice(0, 300),
    nowIso(), nowIso(), nowIso()
  ).run();
  if (!existing) {
    await sendPushToUser(env, user.id, {
      id: `push-ready-${id}`,
      actorId: user.id,
      type: "push_ready",
      body: "以后家人发布新日记、心愿、购物车商品或留言时，这台设备会收到提醒",
    });
  }
  return jsonResponse(request, env, { data: { subscribed: true } });
}

async function handlePushUnsubscribe(request, env, user) {
  const payload = await readJsonRequestBody(request);
  const endpoint = String(payload.endpoint || "").trim();
  if (endpoint) {
    await env.DB.prepare("delete from push_subscriptions where user_id=? and endpoint=?")
      .bind(user.id, endpoint).run();
  } else {
    await env.DB.prepare("delete from push_subscriptions where user_id=?").bind(user.id).run();
  }
  return jsonResponse(request, env, { data: { subscribed: false } });
}

async function createActivityNotifications(env, table, rows, actorId) {
  const insertNotification = async ({ userId, type, photoId = null, commentId = null, body = "" }) => {
    if (!userId || userId === actorId) return;
    const notificationId = randomId();
    await env.DB.prepare(
      `insert into notifications (id, user_id, actor_id, type, photo_id, comment_id, body, is_read, created_at)
       values (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
      .bind(notificationId, userId, actorId, type, photoId, commentId, String(body || "").slice(0, 240), nowIso())
      .run();
    await sendPushToUser(env, userId, {
      id: notificationId,
      actorId,
      type,
      photoId,
      commentId,
      body,
    });
  };

  for (const row of rows) {
    if (table === "photos" || table === "gratitude_notes") {
      const familyUserIds = await getFamilyUserIds(env, actorId);
      await Promise.all(
        familyUserIds
          .filter((userId) => userId !== actorId)
          .map((userId) =>
            insertNotification({
              userId,
              type: table === "photos" ? "diary" : "thanks",
              photoId: table === "photos" ? row.id : null,
              body: table === "photos" ? row.title || row.note : row.body,
            })
          )
      );
      continue;
    }

    if (table === "wishes" || table === "shopping_items") {
      const familyUserIds = await getFamilyUserIds(env, actorId);
      await Promise.all(
        familyUserIds
          .filter((userId) => userId !== actorId)
          .map((userId) => insertNotification({
            userId,
            type: table === "wishes" ? "wish" : "shopping",
            body: table === "wishes" ? row.title : row.name,
          }))
      );
      continue;
    }

    if (table === "photo_favorites") {
      const photo = await env.DB.prepare("select user_id from photos where id=?").bind(row.photo_id).first();
      await insertNotification({ userId: photo?.user_id, type: "favorite", photoId: row.photo_id });
      continue;
    }

    if (table === "photo_comments") {
      const photo = await env.DB.prepare("select user_id from photos where id=?").bind(row.photo_id).first();
      const recipients = new Map();
      if (photo?.user_id && photo.user_id !== actorId) {
        recipients.set(photo.user_id, "comment");
      }
      if (row.parent_id) {
        const parent = await env.DB.prepare("select user_id from photo_comments where id=?").bind(row.parent_id).first();
        if (parent?.user_id && parent.user_id !== actorId) {
          recipients.set(parent.user_id, "reply");
        }
      }
      await Promise.all(
        [...recipients.entries()].map(([userId, type]) =>
          insertNotification({
            userId,
            type,
            photoId: row.photo_id,
            commentId: row.id,
            body: row.body,
          })
        )
      );
    }
  }
}

function getTokyoDayUtcRange(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const start = Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000;
  return {
    start: new Date(start).toISOString(),
    end: new Date(start + 24 * 60 * 60 * 1000).toISOString(),
  };
}

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

async function createDailyMoodReminders(env, scheduledTime) {
  if (!env.DB) return;
  const dateKey = getTokyoDateKey(new Date(scheduledTime));
  const { start, end } = getTokyoDayUtcRange(dateKey);
  const users = await env.DB.prepare("select id from users").all();
  for (const user of users.results || []) {
    const userId = String(user.id || "").trim();
    if (!userId) continue;
    const mood = await env.DB.prepare(
      "select id from mood_diaries where user_id=? and diary_date=? limit 1"
    ).bind(userId, dateKey).first();
    if (mood) continue;
    const existing = await env.DB.prepare(
      `select id from notifications
        where user_id=? and actor_id=? and type='mood_reminder'
          and created_at>=? and created_at<?
        limit 1`
    ).bind(userId, userId, start, end).first();
    if (existing) continue;
    const notificationId = randomId();
    const body = "今天还没有记录心情，点开首页补上吧";
    await env.DB.prepare(
      `insert into notifications (id, user_id, actor_id, type, photo_id, comment_id, body, is_read, created_at)
       values (?, ?, ?, 'mood_reminder', null, null, ?, 0, ?)`
    ).bind(notificationId, userId, userId, body, new Date(scheduledTime).toISOString()).run();
    await sendPushToUser(env, userId, {
      id: notificationId,
      actorId: userId,
      type: "mood_reminder",
      body,
    });
  }
}

async function selectVisibleRows(env, table, userId, orderBy = "created_at desc") {
  const userIds = await getFamilyUserIds(env, userId);
  const placeholders = userIds.map(() => "?").join(",");
  return env.DB.prepare(`select * from ${table} where user_id in (${placeholders}) order by ${orderBy}`)
    .bind(...userIds)
    .all();
}

async function handleD1Export(request, env, user) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const familyUserIds = await getFamilyUserIds(env, user.id);
  const familyIds = await getFamilyIds(env, user.id);
  const userPlaceholders = familyUserIds.map(() => "?").join(",");
  const familyPlaceholders = familyIds.map(() => "?").join(",");
  const [families, members, invitations, profiles, photos, moodDiaries, favorites, comments, recipes, wishes, shoppingItems, weekends, wardrobeLocations, wardrobeItems, wardrobeWearLogs, anniversaries, thanks, notifications, secrets] =
    await Promise.all([
      familyIds.length
        ? env.DB.prepare(`select * from families where id in (${familyPlaceholders})`)
            .bind(...familyIds)
            .all()
        : { results: [] },
      familyIds.length
        ? env.DB.prepare(`select * from family_members where family_id in (${familyPlaceholders})`)
            .bind(...familyIds)
            .all()
        : { results: [] },
      familyIds.length
        ? env.DB.prepare(`select * from family_invitations where family_id in (${familyPlaceholders})`)
            .bind(...familyIds)
            .all()
        : { results: [] },
      selectVisibleRows(env, "user_profiles", user.id, "created_at asc"),
      selectVisibleRows(env, "photos", user.id, "taken_at desc, created_at desc"),
      selectVisibleRows(env, "mood_diaries", user.id, "diary_date desc, user_id asc"),
      env.DB.prepare("select * from photo_favorites where user_id=? order by created_at desc")
        .bind(user.id)
        .all(),
      env.DB.prepare(
        `select photo_comments.* from photo_comments
          join photos on photos.id = photo_comments.photo_id
         where photos.user_id in (${userPlaceholders})
         order by photo_comments.created_at asc`
      )
        .bind(...familyUserIds)
        .all(),
      selectVisibleRows(env, "recipes", user.id, "created_at desc"),
      selectVisibleRows(env, "wishes", user.id, "sort_order asc, created_at desc"),
      selectVisibleRows(env, "shopping_items", user.id, "sort_order asc, created_at desc"),
      selectVisibleRows(env, "weekend_plans", user.id, "plan_date asc"),
      selectVisibleRows(env, "wardrobe_locations", user.id, "sort_order asc, created_at asc"),
      selectVisibleRows(env, "wardrobe_items", user.id, "updated_at desc"),
      selectVisibleRows(env, "wardrobe_wear_logs", user.id, "worn_on desc"),
      selectVisibleRows(env, "anniversaries", user.id, "event_date asc"),
      selectVisibleRows(env, "gratitude_notes", user.id, "created_at desc"),
      env.DB.prepare("select * from notifications where user_id=? order by created_at desc limit 100")
        .bind(user.id)
        .all(),
      env.DB.prepare("select * from secret_items where user_id=? order by is_pinned desc, sort_order asc, created_at desc")
        .bind(user.id)
        .all(),
    ]);
  return jsonResponse(request, env, {
    families: families.results || [],
    family_members: members.results || [],
    family_invitations: invitations.results || [],
    profiles: profiles.results || [],
    photos: photos.results || [],
    mood_diaries: (moodDiaries.results || []).map((row) => denormalizeRow("mood_diaries", row)),
    photo_favorites: favorites.results || [],
    photo_comments: comments.results || [],
    recipes: recipes.results || [],
    wishes: wishes.results || [],
    shopping_items: shoppingItems.results || [],
    weekend_plans: weekends.results || [],
    wardrobe_locations: wardrobeLocations.results || [],
    wardrobe_items: (wardrobeItems.results || []).map((row) => denormalizeRow("wardrobe_items", row)),
    wardrobe_wear_logs: wardrobeWearLogs.results || [],
    anniversaries: anniversaries.results || [],
    gratitude_notes: thanks.results || [],
    notifications: notifications.results || [],
    secret_items: (secrets.results || []).map((row) => denormalizeRow("secret_items", row)),
  });
}


function isFamilyShoppingObjectKey(key) {
  const segments = String(key || "").split("/");
  return segments.length >= 3 && segments[1] === "shopping";
}

async function canDeleteR2Object(env, user, key) {
  const ownerId = String(key || "").split("/")[0] || "";
  if (ownerId === user.id) return true;
  if (!isFamilyShoppingObjectKey(key)) return false;
  const familyUserIds = await getFamilyUserIds(env, user.id);
  return familyUserIds.includes(ownerId);
}

async function handleDelete(request, env, user) {
  const payload = await request.json().catch(() => ({}));
  const key = String(payload.key || "").replace(/^r2:/, "");
  if (!key || !(await canDeleteR2Object(env, user, key))) {
    return jsonResponse(request, env, { error: "Invalid key." }, 400);
  }
  await env.R2_BUCKET.delete(key);
  return jsonResponse(request, env, { ok: true });
}

const BACKUP_TABLES = [
  "families",
  "family_members",
  "family_invitations",
  "user_profiles",
  "photos",
  "mood_diaries",
  "photo_favorites",
  "photo_comments",
  "recipes",
  "wishes",
  "shopping_items",
  "weekend_plans",
  "wardrobe_locations",
  "wardrobe_items",
  "wardrobe_wear_logs",
  "anniversaries",
  "gratitude_notes",
  "notifications",
  "secret_items",
  "secret_folders",
  "trash_items",
];
const BACKUP_RETENTION_DAYS = 7;

function extractR2KeysFromTrashPayload(payload) {
  let text = JSON.stringify(payload || {});
  try {
    text = decodeURIComponent(text);
  } catch {
    // The payload can contain ordinary percent signs; direct fields still work.
  }
  return [...new Set((text.match(/r2:[^"'\s,}\]]+/g) || []).map((value) => value.slice(3)))];
}

async function cleanupExpiredTrash(env) {
  const expired = await env.DB.prepare("select * from trash_items where expires_at <= ? limit 200")
    .bind(nowIso())
    .all();
  for (const item of expired.results || []) {
    const payload = safeJson(item.payload, {});
    const keys = extractR2KeysFromTrashPayload(payload);
    if (keys.length) await env.R2_BUCKET.delete(keys);
    await env.DB.prepare("delete from trash_items where id=?").bind(item.id).run();
  }
  return expired.results?.length || 0;
}

async function createDailyBackup(env) {
  const backup = { version: 1, exported_at: nowIso(), tables: {} };
  for (const table of BACKUP_TABLES) {
    const rows = await env.DB.prepare(`select * from ${table}`).all();
    backup.tables[table] = (rows.results || []).map((row) => denormalizeRow(table, row));
  }
  const date = new Date().toISOString().slice(0, 10);
  const key = `system-backups/d1-${date}.backup`;
  const encrypted = await encryptBackupPayload(env, backup);
  await env.R2_BUCKET.put(key, encrypted, {
    httpMetadata: { contentType: "application/octet-stream", cacheControl: "private, no-store" },
  });

  const oldBefore = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let cursor;
  do {
    const listed = await env.R2_BUCKET.list({ prefix: "system-backups/", cursor });
    const oldKeys = listed.objects
      .filter((object) => object.key.endsWith(".backup") && new Date(object.uploaded).getTime() < oldBefore)
      .map((object) => object.key);
    if (oldKeys.length) await env.R2_BUCKET.delete(oldKeys);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return key;
}

async function getBackupCryptoKey(env) {
  const secret = String(env.BACKUP_ENCRYPTION_KEY || "");
  if (!secret) throw new Error("BACKUP_ENCRYPTION_KEY is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptBackupPayload(env, payload) {
  const key = await getBackupCryptoKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const output = new Uint8Array(iv.length + encrypted.length);
  output.set(iv, 0);
  output.set(encrypted, iv.length);
  return output;
}

async function decryptBackupPayload(env, buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 13) throw new Error("Invalid backup file.");
  const key = await getBackupCryptoKey(env);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12) },
    key,
    bytes.slice(12)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

async function requireFamilyOwner(env, user) {
  const family = await getFamilyContext(env, user.id);
  return family?.owner_id === user.id ? family : null;
}

async function handleBackupList(request, env, user) {
  if (!(await requireFamilyOwner(env, user))) {
    return jsonResponse(request, env, { error: "Only the family owner can access backups." }, 403);
  }
  const listed = await env.R2_BUCKET.list({ prefix: "system-backups/", limit: 100 });
  const data = listed.objects
    .filter((object) => object.key.endsWith(".backup"))
    .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded))
    .map((object) => ({ key: object.key, size: object.size, uploaded: object.uploaded }));
  return jsonResponse(request, env, { data });
}

async function handleBackupDownload(request, env, user, key) {
  if (!(await requireFamilyOwner(env, user))) {
    return jsonResponse(request, env, { error: "Only the family owner can access backups." }, 403);
  }
  if (!key.startsWith("system-backups/") || !key.endsWith(".backup")) {
    return jsonResponse(request, env, { error: "Invalid backup key." }, 400);
  }
  const object = await env.R2_BUCKET.get(key);
  if (!object) return jsonResponse(request, env, { error: "Backup not found." }, 404);
  const payload = await decryptBackupPayload(env, await object.arrayBuffer());
  const filename = key.split("/").pop().replace(/\.backup$/, ".json");
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      ...getCorsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function handleBackupRun(request, env, user) {
  if (!(await requireFamilyOwner(env, user))) {
    return jsonResponse(request, env, { error: "Only the family owner can create backups." }, 403);
  }
  const key = await createDailyBackup(env);
  return jsonResponse(request, env, { data: { key, created_at: nowIso() } });
}

const {
  handleD1Logout,
  handlePublicPhotoList,
  handleTableApi,
  isPublicPhotoListRequest,
} = createTableApi({
  createActivityNotifications,
  getBearerToken,
  getFamilyUserIds,
  jsonResponse,
  nowIso,
  readJsonRequestBody,
  requireDb,
  safeJson,
  sha256Base64Url,
  isFamilyOwner,
  validateDiaryPhotoMedia,
});

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
      }

      const url = new URL(request.url);
      if (url.pathname === "/health") {
        return jsonResponse(request, env, { ok: true, d1: Boolean(env.DB) });
      }

      if (url.pathname === "/api/d1/status") {
        return jsonResponse(request, env, { ok: true, d1: Boolean(env.DB) });
      }
      const rateLimited = checkRateLimit(request, env, url);
      if (rateLimited) return rateLimited;
      if (url.pathname.startsWith("/media/") && request.method === "GET") {
        const media = decodeMediaKey(url.pathname);
        if (!media) return jsonResponse(request, env, { error: "Invalid media path." }, 400);
        return await handleMedia(request, env, media.scope, media.key);
      }
      if (url.pathname === "/api/invite/verify" && request.method === "POST") {
        return await handleInviteVerify(request, env);
      }
      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        return await handleD1Register(request, env);
     }
     if (url.pathname === "/api/auth/login" && request.method === "POST") {
       return await handleD1Login(request, env);
     }
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        return await handleD1Logout(request, env);
      }
      if (url.pathname === "/api/auth/password-reset/request" && request.method === "POST") {
        return await handlePasswordResetRequest(request, env);
      }
      if (url.pathname === "/api/auth/password-reset/confirm" && request.method === "POST") {
        return await handlePasswordResetConfirm(request, env);
      }
      if (url.pathname === "/api/rpc/reset_password_with_recovery_key" && request.method === "POST") {
       return await handlePasswordRecoveryReset(request, env);
     }

      if (
        url.pathname === "/api/table/photos" &&
        request.method === "GET" &&
        isPublicPhotoListRequest(url)
      ) {
        return await handlePublicPhotoList(request, env);
      }

      let user = null;
      user = await requireUser(request, env);
      if (!user?.id) {
        return jsonResponse(request, env, { error: "Unauthorized." }, 401);
      }

      if (url.pathname === "/api/admin/signup-invite" && request.method === "GET") {
        return await handleSignupInviteRead(request, env, user);
      }
      if (url.pathname === "/api/admin/r2-usage" && request.method === "GET") {
        return await handleAdminR2Usage(request, env, user);
      }
      if (url.pathname === "/api/admin/r2-audit" && request.method === "GET") {
        return await handleAdminR2Audit(request, env, user);
      }

      if (url.pathname === "/upload" && request.method === "POST") {
        return await handleUpload(request, env, user);
      }
     if (url.pathname === "/api/auth/me" && request.method === "GET") {
       return await handleD1Me(request, env, user);
     }
      if (url.pathname === "/api/account/email/request" && request.method === "POST") {
        return await handleEmailBindRequest(request, env, user);
      }
      if (url.pathname === "/api/account/email/confirm" && request.method === "POST") {
        return await handleEmailBindConfirm(request, env, user);
      }
     if (url.pathname === "/api/auth/password" && request.method === "POST") {
       return await handlePasswordUpdate(request, env, user);
     }
      if (url.pathname === "/api/push/config" && request.method === "GET") {
        return jsonResponse(request, env, { data: { publicKey: env.VAPID_PUBLIC_KEY || "" } });
      }
      if (url.pathname === "/api/push/subscribe" && request.method === "POST") {
        return await handlePushSubscribe(request, env, user);
      }
      if (url.pathname === "/api/push/unsubscribe" && request.method === "POST") {
        return await handlePushUnsubscribe(request, env, user);
      }
      if (url.pathname === "/api/export" && request.method === "GET") {
        return await handleD1Export(request, env, user);
      }
      if (url.pathname === "/api/backups" && request.method === "GET") {
        return await handleBackupList(request, env, user);
      }
      if (url.pathname === "/api/backups/run" && request.method === "POST") {
        return await handleBackupRun(request, env, user);
      }
      if (url.pathname.startsWith("/api/backups/") && request.method === "GET") {
        const key = decodeURIComponent(url.pathname.replace("/api/backups/", ""));
        return await handleBackupDownload(request, env, user, key);
      }
      if (url.pathname.startsWith("/api/rpc/") && request.method === "POST") {
        const name = decodeURIComponent(url.pathname.replace("/api/rpc/", ""));
        return await handleRpc(request, env, user, name);
      }
      if (url.pathname.startsWith("/api/table/")) {
        const table = decodeURIComponent(url.pathname.replace("/api/table/", ""));
        return await handleTableApi(request, env, user, table);
      }
      if (url.pathname === "/copy" && request.method === "POST") {
        return await handleCopy(request, env, user);
      }
      if (url.pathname === "/object" && request.method === "DELETE") {
        return await handleDelete(request, env, user);
      }

      return jsonResponse(request, env, { error: "Not found." }, 404);
    } catch (error) {
      const isUniqueConstraint = /(?:unique|primary key) constraint failed/i.test(String(error?.message || ""));
      const status = error instanceof WorkerHttpError ? error.status : isUniqueConstraint ? 409 : 500;
      if (status >= 500) console.error("Worker request failed", { name: error?.name || "Error", status });
      return jsonResponse(
        request,
        env,
        { error: status === 500 ? "Worker error. Please try again." : error.message },
        status
      );
    }
  },
  async scheduled(controller, env, ctx) {
    // UTC 09:00 = 18:00 Asia/Tokyo. Backup must never send mood reminders.
    if (controller.cron === "0 9 * * *") {
      ctx.waitUntil(createDailyMoodReminders(env, controller.scheduledTime));
    } else if (controller.cron === "20 18 * * *") {
      ctx.waitUntil(cleanupExpiredTrash(env));
      ctx.waitUntil(createDailyBackup(env));
    }
  },
};
