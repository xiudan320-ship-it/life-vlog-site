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

const TABLE_CONFIG = {
  user_profiles: {
    columns: [
      "user_id",
      "username",
      "recharge_total",
      "vip_level",
      "experience_total",
      "last_login_date",
      "local_data_migrated",
      "theme_preference",
      "home_name",
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
    columns: ["id", "user_id", "title", "category", "note", "images", "linked_photo_id", "created_at", "updated_at"],
    scope: "own",
    writeScope: "own",
    ownerColumn: "user_id",
    jsonColumns: ["images"],
  },
};

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
  return getD1UserFromToken(token, env);
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

  const publicHost = env.PUBLIC_R2_URL ? new URL(env.PUBLIC_R2_URL).host : "";
  return (
    url.protocol === "https:" &&
    url.host !== publicHost &&
    url.pathname.includes("/storage/v1/object/public/")
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

async function handleRpc(request, env, user, name) {
  const dbError = requireDb(request, env);
  if (dbError) return dbError;
  const payload = request.method === "GET" ? {} : await readJsonRequestBody(request);

  if (name === "get_my_family_members") {
    const family = await getFamilyContext(env, user.id);
    return jsonResponse(request, env, {
      data: family
        ? family.members.map((member) => ({
            ...member,
            family_id: family.id,
            family_name: family.name,
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

  if (name === "get_my_notifications") {
    const limit = Math.min(100, Math.max(1, Number(payload.p_limit || 50)));
    const rows = await env.DB.prepare("select * from notifications where user_id=? order by created_at desc limit ?")
      .bind(user.id, limit)
      .all();
    return jsonResponse(request, env, {
      data: (rows.results || []).map((row) => denormalizeRow("notifications", row)),
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
  const { hash } = await hashPassword(recoveryKey, credential.recovery_salt);
  if (hash !== credential.recovery_hash) return jsonResponse(request, env, { data: false });
  const next = await hashPassword(newPassword);
  await env.DB.prepare(
    "update users set password_hash=?, password_salt=?, updated_at=? where id=?"
  )
    .bind(next.hash, next.salt, nowIso(), user.id)
    .run();
  return jsonResponse(request, env, { data: true });
}

async function handlePasswordUpdate(request, env, user) {
  const payload = await readJsonRequestBody(request);
  const password = String(payload.password || "");
  if (password.length < 6 || password.length > 128) {
    return jsonResponse(request, env, { error: "Password must be 6-128 characters." }, 400);
  }
  const next = await hashPassword(password);
  await env.DB.prepare("update users set password_hash=?, password_salt=?, updated_at=? where id=?")
    .bind(next.hash, next.salt, nowIso(), user.id)
    .run();
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
  const [families, members, invitations, profiles, photos, favorites, comments, recipes, wishes, weekends, anniversaries, thanks, notifications, secrets] =
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
  if (["is_public", "is_featured", "is_pinned", "is_done", "is_read"].includes(column)) {
    return value ? 1 : 0;
  }
  if (["seasonings", "ingredients", "steps", "food_options", "images"].includes(column)) {
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
    "linked_photo_id",
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
    const conflict = payload.onConflict
      ? String(payload.onConflict).split(",").map((item) => item.trim()).filter(Boolean)
      : config.conflictColumns || [config.columns.includes("id") ? "id" : config.columns[0]];
    const count = await upsertRows(env, table, sanitizedRows, config.columns, action === "upsert" ? conflict : undefined);
    return jsonResponse(request, env, {
      data: sanitizedRows.map((row) => denormalizeRow(table, row)),
      count,
    });
  }

  const filters = payload.filters || [];
  if (action === "update") {
    if (!(await assertRowsWritable(env, table, config, user, filters))) {
      return jsonResponse(request, env, { error: "Not allowed." }, 403);
    }
    const updates = sanitizeRowForTable(table, payload.values || {}, user);
    delete updates.id;
    delete updates.created_at;
    if (config.ownerColumn) delete updates[config.ownerColumn];
    const updateColumns = Object.keys(updates).filter((column) => config.columns.includes(column));
    if (!updateColumns.length) return jsonResponse(request, env, { data: [] });
    const setValues = updateColumns.map((column) => updates[column]);
    const whereValues = [];
    const scope = await buildScopeSql(env, table, config, user, whereValues, true);
    const clauses = [...scope, ...buildFilterSql(config, filters, whereValues)];
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
    const values = columns.map((column) => normalizeColumnValue(table, column, row[column]));
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
      if (url.pathname === "/api/rpc/reset_password_with_recovery_key" && request.method === "POST") {
        return handlePasswordRecoveryReset(request, env);
      }

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
      if (url.pathname === "/api/auth/password" && request.method === "POST") {
        return handlePasswordUpdate(request, env, user);
      }
      if (url.pathname === "/api/export" && request.method === "GET") {
        return handleD1Export(request, env, user);
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
};
