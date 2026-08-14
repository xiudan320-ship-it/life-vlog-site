import { buildPushPayload } from "@block65/webcrypto-web-push";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const SESSION_DAYS = 3650;
const SESSION_REFRESH_WINDOW_MS = 30 * 86400 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
const PASSWORD_HASH_ITERATIONS = 210000;
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

const TABLE_CONFIG = {
  user_profiles: {
    columns: [
      "user_id",
      "username",
      "recharge_total",
      "vip_level",
      "experience_total",
      "last_login_date",
      "login_streak",
      "today_experience_date",
      "today_experience_amount",
      "local_data_migrated",
      "theme_preference",
      "home_name",
      "secret_default_folder_id",
      "food_options",
      "preferred_thanks_color",
      "avatar_url",
      "avatar_path",
      "created_at",
      "updated_at",
    ],
    scope: "family",
    writeScope: "own",
    ownerColumn: "user_id",
    jsonColumns: ["food_options"],
    booleanColumns: ["local_data_migrated"],
  },
  photos: {
    columns: [
      "id",
      "user_id",
      "title",
      "note",
      "category",
      "taken_at",
      "is_public",
      "image_path",
      "image_url",
      "width",
      "height",
      "is_featured",
      "is_pinned",
      "created_at",
      "updated_at",
    ],
    scope: "family",
    writeScope: "own",
    ownerColumn: "user_id",
    booleanColumns: ["is_public", "is_featured", "is_pinned"],
  },
  photo_favorites: {
    columns: ["user_id", "photo_id", "created_at"],
    scope: "own",
    writeScope: "own",
    ownerColumn: "user_id",
    conflictColumns: ["user_id", "photo_id"],
  },
  photo_comments: {
    columns: ["id", "photo_id", "user_id", "parent_id", "body", "created_at", "updated_at"],
    scope: "comments",
    writeScope: "own",
    ownerColumn: "user_id",
  },
  recipes: {
    columns: [
      "id",
      "user_id",
      "name",
      "category",
      "cooking_time",
      "servings",
      "cover_image",
      "seasonings",
      "ingredients",
      "steps",
      "note",
      "created_at",
      "updated_at",
    ],
    scope: "family",
    ownerColumn: "user_id",
    jsonColumns: ["seasonings", "ingredients", "steps"],
  },
  wishes: {
    columns: [
      "id",
      "user_id",
      "title",
      "wish_type",
      "planned_date",
      "priority",
      "note",
      "completion_note",
      "is_done",
      "completed_at",
      "created_at",
      "updated_at",
    ],
    scope: "family",
    ownerColumn: "user_id",
    booleanColumns: ["is_done"],
  },
  weekend_plans: {
    columns: [
      "id",
      "user_id",
      "title",
      "plan_date",
      "location",
      "plan_type",
      "note",
      "is_done",
      "created_at",
      "updated_at",
    ],
    scope: "family",
    ownerColumn: "user_id",
    booleanColumns: ["is_done"],
  },
  wardrobe_locations: {
    columns: ["id", "user_id", "name", "note", "sort_order", "created_at", "updated_at"],
    scope: "family",
    ownerColumn: "user_id",
  },
  wardrobe_items: {
    columns: [
      "id",
      "user_id",
      "wearer_user_id",
      "name",
      "item_type",
      "category",
      "description",
      "fit_note",
      "location_id",
      "status",
      "seasons",
      "occasions",
      "style_tags",
      "color_tags",
      "images",
      "is_favorite",
      "wear_count",
      "last_worn_at",
      "created_at",
      "updated_at",
    ],
    scope: "family",
    ownerColumn: "user_id",
    jsonColumns: ["seasons", "occasions", "style_tags", "color_tags", "images"],
    booleanColumns: ["is_favorite"],
  },
  wardrobe_wear_logs: {
    columns: ["id", "user_id", "wardrobe_item_id", "worn_on", "note", "created_at"],
    scope: "family",
    ownerColumn: "user_id",
  },
  anniversaries: {
    columns: ["id", "user_id", "title", "event_type", "event_date", "note", "created_at", "updated_at"],
    scope: "family",
    ownerColumn: "user_id",
  },
  gratitude_notes: {
    columns: ["id", "user_id", "body", "text_color", "created_at", "updated_at"],
    scope: "family",
    ownerColumn: "user_id",
  },
  notifications: {
    columns: ["id", "user_id", "actor_id", "type", "photo_id", "comment_id", "body", "is_read", "created_at"],
    scope: "own",
    writeScope: "own",
    ownerColumn: "user_id",
    booleanColumns: ["is_read"],
  },
  secret_items: {
    columns: ["id", "user_id", "folder_id", "title", "category", "note", "cover_image", "cover_path", "images", "linked_photo_id", "photo_sort_descending", "sort_order", "created_at", "updated_at"],
    scope: "own",
    writeScope: "own",
    ownerColumn: "user_id",
    jsonColumns: ["images"],
  },
  secret_folders: {
    columns: ["id", "user_id", "name", "sort_order", "created_at", "updated_at"],
    scope: "own",
    writeScope: "own",
    ownerColumn: "user_id",
  },
  trash_items: {
    columns: ["id", "user_id", "item_type", "item_id", "label", "payload", "deleted_at", "expires_at"],
    scope: "own",
    writeScope: "own",
    ownerColumn: "user_id",
    jsonColumns: ["payload"],
  },
};

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const requestedHeaders = request.headers.get("Access-Control-Request-Headers") || "";
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
    "Access-Control-Allow-Headers": requestedHeaders || "Authorization, Content-Type",
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
  return safeJson(text, {});
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
    return jsonResponse(request, env, { error: "File is too large." }, 413);
  }
  if (!String(file.type || "").startsWith("image/")) {
    return jsonResponse(request, env, { error: "Only image files are allowed." }, 415);
  }

  const folder = cleanSegment(formData.get("folder"), "photos");
  const name = cleanSegment(formData.get("name"), "image");
  const random = crypto.randomUUID().slice(0, 8);
  const key = `${user.id}/${folder}/${Date.now()}-${random}-${name}.jpg`;
  const contentType = file.type || "image/jpeg";

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
    const response = await fetch(currentUrl, { redirect: "manual" });
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

  return handleD1Login(request, env, { username, password });
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
  const scope = await buildScopeSql(env, recycleConfig.table, tableConfig, user, values, true);
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
    true
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
    `select family_members.*, user_profiles.username, user_profiles.avatar_url
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

function getPushCopy(type, actorName, body = "", aggregateCount = 1) {
  const name = actorName || "家庭成员";
  const count = Math.max(1, Number(aggregateCount) || 1);
  const snippets = {
    diary: [`${name} 发布了新日记`, body || "家里有一条新的生活记录"],
    thanks: [`${name} 写下了感谢留言`, body || "感谢留言板有了新内容"],
    comment: [`${name} 评论了你的日记${count > 1 ? ` ${count} 次` : ""}`, body || "打开看看对方说了什么"],
    reply: [`${name} 回复了你${count > 1 ? ` ${count} 次` : ""}`, body || "你收到了一条新回复"],
    favorite: [`${name} 收藏了你的日记`, "你的记录被家人收藏了"],
    push_ready: ["通知已开启", "以后家人发布新日记或回复时，这台设备会收到提醒"],
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
    icon: "/assets/app-icon-192.png",
    badge: "/assets/app-icon-192.png",
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
      body: "以后家人发布新日记或回复时，这台设备会收到提醒",
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
  const [families, members, invitations, profiles, photos, favorites, comments, recipes, wishes, weekends, wardrobeLocations, wardrobeItems, wardrobeWearLogs, anniversaries, thanks, notifications, secrets] =
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
      selectVisibleRows(env, "wishes", user.id, "created_at desc"),
      selectVisibleRows(env, "weekend_plans", user.id, "plan_date asc"),
      selectVisibleRows(env, "wardrobe_locations", user.id, "sort_order asc, created_at asc"),
      selectVisibleRows(env, "wardrobe_items", user.id, "updated_at desc"),
      selectVisibleRows(env, "wardrobe_wear_logs", user.id, "worn_on desc"),
      selectVisibleRows(env, "anniversaries", user.id, "event_date asc"),
      selectVisibleRows(env, "gratitude_notes", user.id, "created_at desc"),
      env.DB.prepare("select * from notifications where user_id=? order by created_at desc limit 100")
        .bind(user.id)
        .all(),
      env.DB.prepare("select * from secret_items where user_id=? order by created_at desc")
        .bind(user.id)
        .all(),
    ]);
  return jsonResponse(request, env, {
    families: families.results || [],
    family_members: members.results || [],
    family_invitations: invitations.results || [],
    profiles: profiles.results || [],
    photos: photos.results || [],
    photo_favorites: favorites.results || [],
    photo_comments: comments.results || [],
    recipes: recipes.results || [],
    wishes: wishes.results || [],
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

function asJsonText(value, fallback = []) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? fallback);
}

function normalizeColumnValue(table, column, value) {
  const config = TABLE_CONFIG[table];
  if ((config?.booleanColumns || []).includes(column)) {
    return value ? 1 : 0;
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

function denormalizeRow(table, row) {
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

function parseFiltersFromUrl(url) {
  const filters = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (key.startsWith("eq.")) filters.push({ op: "eq", column: key.slice(3), value });
  }
  const encoded = url.searchParams.get("filters");
  if (encoded) {
    const parsed = safeJson(encoded, []);
    if (Array.isArray(parsed)) filters.push(...parsed);
  }
  return filters;
}

function buildFilterSql(config, filters, values) {
  const clauses = [];
  for (const filter of filters || []) {
    const column = String(filter.column || "");
    if (!config.columns.includes(column)) continue;
    const op = filter.op || "eq";
    if (op === "eq") {
      clauses.push(`${column} = ?`);
      values.push(normalizeColumnValue("", column, filter.value));
    } else if (op === "neq") {
      clauses.push(`${column} <> ?`);
      values.push(normalizeColumnValue("", column, filter.value));
    } else if (op === "in" && Array.isArray(filter.value)) {
      const placeholders = filter.value.map(() => "?").join(",");
      clauses.push(`${column} in (${placeholders})`);
      values.push(...filter.value);
    }
  }
  return clauses;
}

async function buildScopeSql(env, table, config, user, values, writeMode = false) {
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

function sanitizeRowForTable(table, row, user, { forceOwner = false } = {}) {
  const config = TABLE_CONFIG[table];
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

async function assertRowsWritable(env, table, config, user, filters) {
  if (!filters?.length) return false;
  const values = [];
  const scope = await buildScopeSql(env, table, config, user, values, true);
  const clauses = [...scope, ...buildFilterSql(config, filters, values)];
  const row = await env.DB.prepare(`select 1 from ${table} where ${clauses.join(" and ")} limit 1`)
    .bind(...values)
    .first();
  return Boolean(row);
}

async function handleTableApi(request, env, user, table) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const config = TABLE_CONFIG[table];
  if (!config) return jsonResponse(request, env, { error: "Unknown table." }, 404);

  const url = new URL(request.url);
  if (request.method === "GET") {
    const values = [];
    const clauses = [
      ...(await buildScopeSql(env, table, config, user, values)),
      ...buildFilterSql(config, parseFiltersFromUrl(url), values),
    ];
    const orderColumn = url.searchParams.get("order") || "created_at";
    const orderDirection = url.searchParams.get("ascending") === "true" ? "asc" : "desc";
    const safeOrder = config.columns.includes(orderColumn) ? orderColumn : "created_at";
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 500));
    const rows = await env.DB.prepare(
      `select * from ${table} where ${clauses.join(" and ")} order by ${safeOrder} ${orderDirection} limit ?`
    )
      .bind(...values, limit)
      .all();
    return jsonResponse(request, env, { data: (rows.results || []).map((row) => denormalizeRow(table, row)) });
  }

  const payload = await readJsonRequestBody(request);
  const action = String(payload.action || "").toLowerCase();
  if (action === "insert" || action === "upsert") {
    const rows = Array.isArray(payload.values) ? payload.values : [payload.values || {}];
    const sanitizedRows = rows.map((row) =>
      sanitizeRowForTable(table, row, user, { forceOwner: Boolean(config.ownerColumn) })
    );
    let existingPhotoIds = new Set();
    if (table === "photos" && action === "upsert") {
      const ids = sanitizedRows.map((row) => row.id).filter(Boolean);
      if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        const existing = await env.DB.prepare(
          `select id from photos where id in (${placeholders})`
        ).bind(...ids).all();
        existingPhotoIds = new Set((existing.results || []).map((row) => row.id));
      }
    }
    const conflict = payload.onConflict
      ? String(payload.onConflict).split(",").map((item) => item.trim()).filter(Boolean)
      : config.conflictColumns || [config.columns.includes("id") ? "id" : config.columns[0]];
    const count = await upsertRows(env, table, sanitizedRows, config.columns, action === "upsert" ? conflict : undefined);
    if (["photos", "gratitude_notes", "photo_favorites", "photo_comments"].includes(table)) {
      const activityRows = table === "photos" && action === "upsert"
        ? sanitizedRows.filter((row) => !existingPhotoIds.has(row.id))
        : action === "insert"
          ? sanitizedRows
          : [];
      if (activityRows.length) {
        await createActivityNotifications(env, table, activityRows, user.id);
      }
    }
    return jsonResponse(request, env, {
      data: sanitizedRows.map((row) => denormalizeRow(table, row)),
      count,
    });
  }

  const filters = payload.filters || [];
  if (action === "update") {
    const rawUpdates = payload.values && typeof payload.values === "object" ? payload.values : {};
    const adminUnpinRequest =
      table === "photos" &&
      rawUpdates.is_pinned === false &&
      Object.keys(rawUpdates).length === 1 &&
      (await isFamilyOwner(env, user.id));
    if (!adminUnpinRequest && !(await assertRowsWritable(env, table, config, user, filters))) {
      return jsonResponse(request, env, { error: "Not allowed." }, 403);
    }
    const updates = sanitizeRowForTable(table, rawUpdates, user);
    delete updates.id;
    delete updates.created_at;
    if (config.ownerColumn) delete updates[config.ownerColumn];
    const updateColumns = Object.keys(updates).filter((column) => config.columns.includes(column));
    if (!updateColumns.length) return jsonResponse(request, env, { data: [] });
    const whereValues = [];
    const scope = await buildScopeSql(env, table, config, user, whereValues, !adminUnpinRequest);
    const clauses = [...scope, ...buildFilterSql(config, filters, whereValues)];
    if (table === "user_profiles") {
      const current = await env.DB.prepare(
        `select login_streak, experience_total, last_login_date
           from user_profiles
          where ${clauses.join(" and ")}
          limit 1`
      )
        .bind(...whereValues)
        .first();
      if (current) {
        if (Object.prototype.hasOwnProperty.call(updates, "login_streak")) {
          updates.login_streak = Math.max(
            Number(current.login_streak) || 0,
            Number(updates.login_streak) || 0
          );
        }
        if (Object.prototype.hasOwnProperty.call(updates, "experience_total")) {
          updates.experience_total = Math.max(
            Number(current.experience_total) || 0,
            Number(updates.experience_total) || 0
          );
        }
        if (
          Object.prototype.hasOwnProperty.call(updates, "last_login_date") &&
          current.last_login_date &&
          String(current.last_login_date) > String(updates.last_login_date || "")
        ) {
          updates.last_login_date = current.last_login_date;
        }
      }
    }
    const setValues = updateColumns.map((column) => updates[column]);
    await env.DB.prepare(
      `update ${table} set ${updateColumns.map((column) => `${column}=?`).join(",")} where ${clauses.join(" and ")}`
    )
      .bind(...setValues, ...whereValues)
      .run();
    return handleTableApi(new Request(`${url.origin}${url.pathname}?filters=${encodeURIComponent(JSON.stringify(filters))}`), env, user, table);
  }

  if (action === "delete") {
    if (!(await assertRowsWritable(env, table, config, user, filters))) {
      return jsonResponse(request, env, { error: "Not allowed." }, 403);
    }
    const values = [];
    const scope = await buildScopeSql(env, table, config, user, values, true);
    const clauses = [...scope, ...buildFilterSql(config, filters, values)];
    const rows = await env.DB.prepare(`select * from ${table} where ${clauses.join(" and ")}`)
      .bind(...values)
      .all();
    await env.DB.prepare(`delete from ${table} where ${clauses.join(" and ")}`)
      .bind(...values)
      .run();
    return jsonResponse(request, env, {
      data: (rows.results || []).map((row) => denormalizeRow(table, row)),
      count: rows.results?.length || 0,
    });
  }

  return jsonResponse(request, env, { error: "Unsupported table action." }, 400);
}

async function upsertRows(env, table, rows, columns, conflictColumns = null) {
  if (!rows.length) return 0;
  const placeholders = columns.map(() => "?").join(",");
  const conflict = conflictColumns || [columns.includes("id") ? "id" : columns[0]];
  const conflictSet = new Set(conflict);
  const updates = columns
    .filter((column) => !conflictSet.has(column))
    .map((column) => `${column}=excluded.${column}`)
    .join(",");
  let count = 0;
  for (const row of rows) {
    let effectiveRow = row;
    if (table === "user_profiles" && row.user_id) {
      const current = await env.DB.prepare(
        "select login_streak, experience_total, last_login_date from user_profiles where user_id=? limit 1"
      )
        .bind(row.user_id)
        .first();
      if (current) {
        effectiveRow = { ...row };
        effectiveRow.login_streak = Math.max(
          Number(current.login_streak) || 0,
          Number(row.login_streak) || 0
        );
        effectiveRow.experience_total = Math.max(
          Number(current.experience_total) || 0,
          Number(row.experience_total) || 0
        );
        if (
          current.last_login_date &&
          String(current.last_login_date) > String(row.last_login_date || "")
        ) {
          effectiveRow.last_login_date = current.last_login_date;
        }
      }
    }
    const values = columns.map((column) => normalizeColumnValue(table, column, effectiveRow[column]));
    await env.DB.prepare(
      `insert into ${table} (${columns.join(",")}) values (${placeholders})
       on conflict(${conflict.join(",")}) do update set ${updates || `${conflict[0]}=excluded.${conflict[0]}`}`
    )
      .bind(...values)
      .run();
    count += 1;
  }
  return count;
}

async function handleDelete(request, env, user) {
  const payload = await request.json().catch(() => ({}));
  const key = String(payload.key || "").replace(/^r2:/, "");
  if (!key || !key.startsWith(`${user.id}/`)) {
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
  "photo_favorites",
  "photo_comments",
  "recipes",
  "wishes",
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

  const oldBefore = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let cursor;
  do {
    const listed = await env.R2_BUCKET.list({ prefix: "system-backups/", cursor });
    const oldKeys = listed.objects
      .filter((object) => new Date(object.uploaded).getTime() < oldBefore)
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

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: getCorsHeaders(request, env) });
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
        return handleMedia(request, env, media.scope, media.key);
      }
      if (url.pathname === "/api/invite/verify" && request.method === "POST") {
        return handleInviteVerify(request, env);
      }
      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        return handleD1Register(request, env);
      }
     if (url.pathname === "/api/auth/login" && request.method === "POST") {
       return handleD1Login(request, env);
     }
      if (url.pathname === "/api/auth/password-reset/request" && request.method === "POST") {
        return handlePasswordResetRequest(request, env);
      }
      if (url.pathname === "/api/auth/password-reset/confirm" && request.method === "POST") {
        return handlePasswordResetConfirm(request, env);
      }
     if (url.pathname === "/api/rpc/reset_password_with_recovery_key" && request.method === "POST") {
       return handlePasswordRecoveryReset(request, env);
     }

      let user = null;
      user = await requireUser(request, env);
      if (!user?.id) {
        return jsonResponse(request, env, { error: "Unauthorized." }, 401);
      }

      if (url.pathname === "/api/admin/signup-invite" && request.method === "GET") {
        return handleSignupInviteRead(request, env, user);
      }

      if (url.pathname === "/upload" && request.method === "POST") {
        return handleUpload(request, env, user);
      }
     if (url.pathname === "/api/auth/me" && request.method === "GET") {
       return handleD1Me(request, env, user);
     }
      if (url.pathname === "/api/account/email/request" && request.method === "POST") {
        return handleEmailBindRequest(request, env, user);
      }
      if (url.pathname === "/api/account/email/confirm" && request.method === "POST") {
        return handleEmailBindConfirm(request, env, user);
      }
     if (url.pathname === "/api/auth/password" && request.method === "POST") {
       return handlePasswordUpdate(request, env, user);
     }
      if (url.pathname === "/api/push/config" && request.method === "GET") {
        return jsonResponse(request, env, { data: { publicKey: env.VAPID_PUBLIC_KEY || "" } });
      }
      if (url.pathname === "/api/push/subscribe" && request.method === "POST") {
        return handlePushSubscribe(request, env, user);
      }
      if (url.pathname === "/api/push/unsubscribe" && request.method === "POST") {
        return handlePushUnsubscribe(request, env, user);
      }
      if (url.pathname === "/api/export" && request.method === "GET") {
        return handleD1Export(request, env, user);
      }
      if (url.pathname === "/api/backups" && request.method === "GET") {
        return handleBackupList(request, env, user);
      }
      if (url.pathname === "/api/backups/run" && request.method === "POST") {
        return handleBackupRun(request, env, user);
      }
      if (url.pathname.startsWith("/api/backups/") && request.method === "GET") {
        const key = decodeURIComponent(url.pathname.replace("/api/backups/", ""));
        return handleBackupDownload(request, env, user, key);
      }
      if (url.pathname.startsWith("/api/rpc/") && request.method === "POST") {
        const name = decodeURIComponent(url.pathname.replace("/api/rpc/", ""));
        return handleRpc(request, env, user, name);
      }
      if (url.pathname.startsWith("/api/table/")) {
        const table = decodeURIComponent(url.pathname.replace("/api/table/", ""));
        return handleTableApi(request, env, user, table);
      }
      if (url.pathname === "/copy" && request.method === "POST") {
        return handleCopy(request, env, user);
      }
      if (url.pathname === "/object" && request.method === "DELETE") {
        return handleDelete(request, env, user);
      }

      return jsonResponse(request, env, { error: "Not found." }, 404);
    } catch (error) {
      const detail = error?.message || String(error);
      return jsonResponse(
        request,
        env,
        { error: detail ? `Worker error: ${detail}` : "Worker error.", detail },
        500
      );
    }
  },
  async scheduled(_controller, env, ctx) {
    // The scheduled task only expires recycle-bin entries. Automatic backups
    // are intentionally disabled for this private family app.
    ctx.waitUntil(cleanupExpiredTrash(env));
  },
};
