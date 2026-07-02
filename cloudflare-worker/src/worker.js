const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigin = allowed.some((item) => origin === item || origin.startsWith(`${item}/`))
    ? origin
    : allowed[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
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

function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

async function requireUser(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });
  if (!response.ok) return null;
  return response.json();
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
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: getCorsHeaders(request, env) });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return jsonResponse(request, env, { ok: true });
    }

    const user = await requireUser(request, env);
    if (!user?.id) {
      return jsonResponse(request, env, { error: "Unauthorized." }, 401);
    }

    if (url.pathname === "/upload" && request.method === "POST") {
      return handleUpload(request, env, user);
    }
    if (url.pathname === "/copy" && request.method === "POST") {
      return handleCopy(request, env, user);
    }
    if (url.pathname === "/object" && request.method === "DELETE") {
      return handleDelete(request, env, user);
    }

    return jsonResponse(request, env, { error: "Not found." }, 404);
  },
};
