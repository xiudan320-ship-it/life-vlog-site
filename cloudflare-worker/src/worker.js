const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const SESSION_DAYS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMITS = {
  "/api/auth/login": 30,
  "/api/auth/register": 5,
  "/api/invite/verify": 20,
  "/upload": 60,
  "/copy": 90,
  "/object": 90,
  default: 240,
};

const rateLimitBuckets = globalThis.__lifeVlogRateLimitBuckets || new Map();
globalThis.__lifeVlogRateLimitBuckets = rateLimitBuckets;

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const requestedHeaders = request.headers.get("Access-Control-Request-Headers") || "";
  const allowedOrigin = origin || "*";

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

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function safeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
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

async function hashPassword(password, salt = toBase64Url(crypto.getRandomValues(new Uint8Array(16)))) {
  const hash = await sha256Base64Url(`${salt}:${password}`);
  return { salt, hash };
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
  const limit = RATE_LIMITS[url.pathname] || RATE_LIMITS.default;
  const key = `${getClientIp(request)}:${url.pathname}`;
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
  const tokenHash = await sha256Base64Url(token);
  const row = await env.DB.prepare(
    `select users.id, users.username
       from sessions
       join users on users.id = sessions.user_id
      where sessions.token_hash = ? and sessions.expires_at > ?`
  )
    .bind(tokenHash, nowIso())
    .first();
  if (!row?.id) return null;
  return { id: row.id, username: row.username, source: "d1" };
}

async function getD1UserFromSession(request, env) {
  return getD1UserFromToken(getBearerToken(request), env);
}

async function requireUserByToken(token, env) {
  const d1User = await getD1UserFromToken(token, env);
  if (d1User) return d1User;

  if (!token) return null;

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? { ...user, source: "supabase" } : null;
}

async function requireUser(request, env) {
  return requireUserByToken(getBearerToken(request), env);
}

async function readJsonRequestBody(request) {
  const text = await request.text().catch(() => "");
  return safeJson(text, {});
}

function publicUrl(env, key) {
  return `${String(env.PUBLIC_R2_URL || "").replace(/\/+$/, "")}/${key}`;
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

  const supabaseHost = new URL(env.SUPABASE_URL).host;
  const publicHost = env.PUBLIC_R2_URL ? new URL(env.PUBLIC_R2_URL).host : "";
  return (
    url.protocol === "https:" &&
    url.host !== publicHost &&
    (url.host === supabaseHost || url.pathname.includes("/storage/v1/object/public/"))
  );
}

async function handleCopy(request, env, user) {
  const payload = await request.json().catch(() => ({}));
  const sourceUrl = String(payload.url || "");
  if (!isAllowedCopySource(sourceUrl, env)) {
    return jsonResponse(request, env, { error: "Invalid source URL." }, 400);
  }

  const response = await fetch(sourceUrl);
  if (!response.ok || !response.body) {
    return jsonResponse(request, env, { error: "Could not read source image." }, 502);
  }

  const contentLength = Number(response.headers.get("Content-Length")) || 0;
  if (contentLength > MAX_UPLOAD_BYTES) {
    return jsonResponse(request, env, { error: "Source file is too large." }, 413);
  }

  const folder = cleanSegment(payload.folder, "migrated");
  const name = cleanSegment(payload.name, "image");
  const random = crypto.randomUUID().slice(0, 8);
  const key = `${user.id}/${folder}/${Date.now()}-${random}-${name}.jpg`;
  const contentType = response.headers.get("Content-Type") || "image/jpeg";

  await env.R2_BUCKET.put(key, response.body, {
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
    size: contentLength,
    contentType,
  });
}

async function handleD1Register(request, env) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
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

async function handleD1Login(request, env, directPayload = null) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const payload = directPayload || (await request.json().catch(() => ({})));
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  const user = await env.DB.prepare("select * from users where lower(username)=lower(?)")
    .bind(username)
    .first();
  if (!user) return jsonResponse(request, env, { error: "Invalid login credentials." }, 401);

  const { hash } = await hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) {
    return jsonResponse(request, env, { error: "Invalid login credentials." }, 401);
  }

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
    user: { id: user.id, username: user.username },
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

async function ensurePlaceholderUser(env, userId, username = "family-member") {
  const exists = await env.DB.prepare("select id from users where id=?").bind(userId).first();
  if (exists) return;
  const randomPassword = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const { salt, hash } = await hashPassword(randomPassword);
  await env.DB.prepare(
    "insert into users (id, username, password_hash, password_salt) values (?, ?, ?, ?)"
  )
    .bind(userId, `${username}-${userId.slice(0, 6)}`, hash, salt)
    .run();
}

async function handleD1ClaimFromSupabase(request, env, user, parsedPayload = null) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  if (user.source !== "supabase") {
    return jsonResponse(request, env, { error: "This account is already using D1 auth." }, 400);
  }
  const payload = parsedPayload || (await readJsonRequestBody(request));
  const username = String(payload.username || user.user_metadata?.username || user.email || "").trim();
  const password = String(payload.password || "");
  if (!/^[\w.-]{2,48}$/i.test(username)) {
    return jsonResponse(request, env, { error: "Username must be 2-48 letters, numbers, dots or dashes." }, 400);
  }
  if (password.length < 6 || password.length > 128) {
    return jsonResponse(request, env, { error: "Password must be 6-128 characters." }, 400);
  }

  const conflict = await env.DB.prepare(
    "select id from users where lower(username)=lower(?) and id<>?"
  )
    .bind(username, user.id)
    .first();
  if (conflict) return jsonResponse(request, env, { error: "Username already exists in D1." }, 409);

  const { salt, hash } = await hashPassword(password);
  const isOwner = username.toLowerCase() === "xiao980320";
  const rechargeTotal = isOwner ? 298 : 0;
  const vipLevel = isOwner ? 5 : 0;
  await env.DB.batch([
    env.DB.prepare(
      `insert into users (id, username, password_hash, password_salt)
       values (?, ?, ?, ?)
       on conflict(id) do update set
         username=excluded.username,
         password_hash=excluded.password_hash,
         password_salt=excluded.password_salt,
         updated_at=?`
    ).bind(user.id, username, hash, salt, nowIso()),
    env.DB.prepare(
      `insert into user_profiles
       (user_id, username, recharge_total, vip_level, home_name)
       values (?, ?, ?, ?, ?)
       on conflict(user_id) do update set
         username=excluded.username,
         recharge_total=max(user_profiles.recharge_total, excluded.recharge_total),
         vip_level=max(user_profiles.vip_level, excluded.vip_level),
         updated_at=?`
    ).bind(user.id, username, rechargeTotal, vipLevel, "咻蛋之家", nowIso()),
  ]);

  return handleD1Login(request, env, { username, password });
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
  const [families, members, invitations, profiles, photos, favorites, comments, recipes, wishes, weekends, anniversaries, thanks, notifications] =
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
      selectVisibleRows(env, "anniversaries", user.id, "event_date asc"),
      selectVisibleRows(env, "gratitude_notes", user.id, "created_at desc"),
      env.DB.prepare("select * from notifications where user_id=? order by created_at desc limit 100")
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
    anniversaries: anniversaries.results || [],
    gratitude_notes: thanks.results || [],
    notifications: notifications.results || [],
  });
}

function rowsFromPayload(payload, key) {
  const value = payload?.[key];
  return Array.isArray(value) ? value : [];
}

function rowsFromAnyPayloadKey(payload, keys) {
  for (const key of keys) {
    const rows = rowsFromPayload(payload, key);
    if (rows.length) return rows;
  }
  return [];
}

function asJsonText(value, fallback = []) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? fallback);
}

function normalizeColumnValue(table, column, value) {
  if (["is_public", "is_featured", "is_pinned", "is_done", "is_read"].includes(column)) {
    return value ? 1 : 0;
  }
  if (["seasonings", "ingredients", "steps", "food_options"].includes(column)) {
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
  if (column === "status") {
    return ["pending", "accepted", "declined"].includes(value) ? value : "pending";
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
  ]);
  if (table === "notifications" && ["photo_id", "comment_id"].includes(column)) {
    return value || null;
  }
  if (nullableColumns.has(column) && (value === undefined || value === null || value === "")) {
    return null;
  }
  return value ?? "";
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
    const values = columns.map((column) => normalizeColumnValue(table, column, row[column]));
    try {
      await env.DB.prepare(
        `insert into ${table} (${columns.join(",")}) values (${placeholders})
         on conflict(${conflict.join(",")}) do update set ${updates || `${conflict[0]}=excluded.${conflict[0]}`}`
      )
        .bind(...values)
        .run();
      count += 1;
    } catch (error) {
      const message = error?.message || String(error);
      if (
        message.includes("FOREIGN KEY constraint failed") ||
        message.includes("CHECK constraint failed") ||
        message.includes("NOT NULL constraint failed")
      ) {
        continue;
      }
      throw error;
    }
  }
  return count;
}

async function handleD1Import(request, env, user, parsedPayload = null) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const payload = parsedPayload || (await readJsonRequestBody(request));
  const counts = {};
  const profilesForUsers = rowsFromAnyPayloadKey(payload, ["user_profiles", "profiles"]);
  for (const profile of profilesForUsers) {
    if (profile.user_id) {
      await ensurePlaceholderUser(env, profile.user_id, profile.username || "family-member");
    }
  }
  for (const row of [
    ...rowsFromPayload(payload, "families"),
    ...rowsFromPayload(payload, "family_members"),
    ...rowsFromPayload(payload, "family_invitations"),
    ...rowsFromPayload(payload, "photos"),
    ...rowsFromPayload(payload, "recipes"),
    ...rowsFromPayload(payload, "wishes"),
    ...rowsFromPayload(payload, "weekend_plans"),
    ...rowsFromPayload(payload, "anniversaries"),
    ...rowsFromPayload(payload, "gratitude_notes"),
    ...rowsFromPayload(payload, "photo_comments"),
    ...rowsFromPayload(payload, "notifications"),
  ]) {
    for (const key of ["user_id", "owner_id", "invited_user_id", "invited_by", "actor_id"]) {
      if (row?.[key]) await ensurePlaceholderUser(env, row[key], "family-member");
    }
  }

  counts.families = await upsertRows(env, "families", rowsFromPayload(payload, "families"), [
    "id",
    "name",
    "owner_id",
    "created_at",
  ]);
  counts.family_members = await upsertRows(env, "family_members", rowsFromPayload(payload, "family_members"), [
    "family_id",
    "user_id",
    "role",
    "joined_at",
  ], ["family_id", "user_id"]);
  counts.family_invitations = await upsertRows(
    env,
    "family_invitations",
    rowsFromPayload(payload, "family_invitations"),
    ["id", "family_id", "invited_user_id", "invited_by", "status", "created_at", "responded_at"]
  );
  counts.profiles = await upsertRows(env, "user_profiles", profilesForUsers, [
    "user_id",
    "username",
    "recharge_total",
    "vip_level",
    "experience_total",
    "last_login_date",
    "theme_preference",
    "home_name",
    "food_options",
    "preferred_thanks_color",
    "avatar_url",
    "avatar_path",
    "created_at",
    "updated_at",
  ]);
  counts.photos = await upsertRows(env, "photos", rowsFromPayload(payload, "photos"), [
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
  ]);
  counts.recipes = await upsertRows(env, "recipes", rowsFromPayload(payload, "recipes"), [
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
  ]);
  counts.wishes = await upsertRows(env, "wishes", rowsFromPayload(payload, "wishes"), [
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
  ]);
  counts.weekend_plans = await upsertRows(env, "weekend_plans", rowsFromPayload(payload, "weekend_plans"), [
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
  ]);
  counts.anniversaries = await upsertRows(env, "anniversaries", rowsFromPayload(payload, "anniversaries"), [
    "id",
    "user_id",
    "title",
    "event_type",
    "event_date",
    "note",
    "created_at",
    "updated_at",
  ]);
  counts.gratitude_notes = await upsertRows(env, "gratitude_notes", rowsFromPayload(payload, "gratitude_notes"), [
    "id",
    "user_id",
    "body",
    "text_color",
    "created_at",
    "updated_at",
  ]);
  counts.photo_favorites = await upsertRows(env, "photo_favorites", rowsFromPayload(payload, "photo_favorites"), [
    "user_id",
    "photo_id",
    "created_at",
  ], ["user_id", "photo_id"]);
  counts.photo_comments = await upsertRows(env, "photo_comments", rowsFromPayload(payload, "photo_comments"), [
    "id",
    "photo_id",
    "user_id",
    "parent_id",
    "body",
    "created_at",
    "updated_at",
  ]);
  counts.notifications = await upsertRows(env, "notifications", rowsFromPayload(payload, "notifications"), [
    "id",
    "user_id",
    "actor_id",
    "type",
    "photo_id",
    "comment_id",
    "body",
    "is_read",
    "created_at",
  ]);

  return jsonResponse(request, env, { ok: true, counts });
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

async function readBridgePayload(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData().catch(() => null);
    return safeJson(formData?.get("payload"), {});
  }
  return readJsonRequestBody(request);
}

function bridgeResponse(payload) {
  return htmlResponse(`<!doctype html>
<meta charset="utf-8">
<script>
parent.postMessage(${safeScriptJson(payload)}, "*");
</script>`);
}

async function handleMigrationBridge(request, env, pathname) {
  let bridgeId = "";
  try {
    const payload = await readBridgePayload(request);
    bridgeId = String(payload.bridge_id || "");
    const user = await requireUserByToken(String(payload.access_token || ""), env);
    delete payload.access_token;
    delete payload.bridge_id;
    if (!user?.id) {
      return bridgeResponse({ bridgeId, ok: false, status: 401, data: { error: "Unauthorized." } });
    }
    const response =
      pathname === "/api/migration/claim-supabase"
        ? await handleD1ClaimFromSupabase(request, env, user, payload)
        : await handleD1Import(request, env, user, payload);
    const text = await response.text();
    return bridgeResponse({
      bridgeId,
      ok: response.ok,
      status: response.status,
      data: safeJson(text, {}),
    });
  } catch (error) {
    return bridgeResponse({
      bridgeId,
      ok: false,
      status: 500,
      data: { error: "Worker error.", detail: error?.message || String(error) },
    });
  }
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
      if (url.pathname === "/api/invite/verify" && request.method === "POST") {
        return handleInviteVerify(request, env);
      }
      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        return handleD1Register(request, env);
      }
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        return handleD1Login(request, env);
      }

      if (url.pathname.startsWith("/api/migration/")) {
        return jsonResponse(request, env, { error: "Migration tools have been retired." }, 410);
      }

      let parsedPayload = null;
      let user = null;
      user = await requireUser(request, env);
      if (!user?.id) {
        return jsonResponse(request, env, { error: "Unauthorized." }, 401);
      }

      if (url.pathname === "/upload" && request.method === "POST") {
        return handleUpload(request, env, user);
      }
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        return handleD1Me(request, env, user);
      }
      if (url.pathname === "/api/export" && request.method === "GET") {
        return handleD1Export(request, env, user);
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
};
