const WORKER_URL = "https://life-vlog-r2-upload.xiudan320-life.workers.dev";
const FIXTURE_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='%23d9c2a3'/%3E%3C/svg%3E";
const FIXTURE_MEDIA_URL = "/__fixture-media";
const FIXTURE_VIDEO_URL = `${FIXTURE_MEDIA_URL}/fixture-camera-talent.mp4`;
const FIXTURE_LONG_VIDEO_URL = `${FIXTURE_MEDIA_URL}/fixture-long-video.mp4`;
const FIXTURE_VIDEO_NOTE = `<!--life-vlog-media:${encodeURIComponent(JSON.stringify([{
  type: "video",
  image_url: FIXTURE_IMAGE,
  thumbnail_url: FIXTURE_IMAGE,
  poster_url: FIXTURE_IMAGE,
  video_url: FIXTURE_VIDEO_URL,
  video_type: "video/mp4",
}]))}-->`;

const tableSeeds = {
  photos: [
    {
      id: "fixture-photo",
      user_id: "fixture-user",
      category: "日常",
      title: "Fixture diary",
      note: "只读发布回归数据",
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "live",
      motion_url: `${FIXTURE_MEDIA_URL}/fixture-live.mov`,
      created_at: "2030-01-01T00:00:00.000Z",
      taken_at: "2030-01-01T00:00:00.000Z",
      is_public: true,
    },
    {
      id: "fixture-offscreen-photo",
      user_id: "fixture-user",
      category: "旅行",
      title: "Fixture offscreen diary",
      note: "用于验证近视口激活边界",
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "live",
      motion_url: `${FIXTURE_MEDIA_URL}/fixture-offscreen.mov`,
      created_at: "2029-01-01T00:00:00.000Z",
      taken_at: "2029-01-01T00:00:00.000Z",
      is_public: true,
    },
    {
      id: "fixture-admin-photo",
      user_id: "fixture-other-user",
      category: "城市",
      title: "Fixture admin diary",
      note: "用于验证分类选择器上下文",
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "image",
      created_at: "2028-06-01T00:00:00.000Z",
      taken_at: "2028-06-01T00:00:00.000Z",
      is_public: true,
    },
    {
      id: "fixture-camera-talent-video",
      user_id: "fixture-user",
      category: "日常",
      title: "摄影小天才",
      note: FIXTURE_VIDEO_NOTE,
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "video",
      video_url: FIXTURE_VIDEO_URL,
      video_type: "video/mp4",
      poster_url: FIXTURE_IMAGE,
      created_at: "2029-06-01T00:00:00.000Z",
      taken_at: "2029-06-01T00:00:00.000Z",
      is_public: true,
    },
    {
      id: "fixture-long-video",
      user_id: "fixture-user",
      category: "日常",
      title: "Fixture long video",
      note: `<!--life-vlog-media:${encodeURIComponent(JSON.stringify([{
        type: "video",
        image_url: FIXTURE_IMAGE,
        thumbnail_url: FIXTURE_IMAGE,
        poster_url: FIXTURE_IMAGE,
        video_url: FIXTURE_LONG_VIDEO_URL,
        video_type: "video/mp4",
      }]))}-->`,
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "video",
      video_url: FIXTURE_LONG_VIDEO_URL,
      video_type: "video/mp4",
      poster_url: FIXTURE_IMAGE,
      created_at: "2029-05-01T00:00:00.000Z",
      taken_at: "2029-05-01T00:00:00.000Z",
      is_public: true,
    },
    {
      id: "fixture-far-photo",
      user_id: "fixture-user",
      category: "城市",
      title: "Fixture far diary",
      note: "用于验证未近视口不加载",
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "live",
      motion_url: `${FIXTURE_MEDIA_URL}/fixture-far.mov`,
      created_at: "2028-01-01T00:00:00.000Z",
      taken_at: "2028-01-01T00:00:00.000Z",
      is_public: true,
    },
    {
      id: "fixture-remote-photo",
      user_id: "fixture-user",
      category: "食物",
      title: "Fixture remote diary",
      note: "用于验证更远处媒体不提前激活",
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "live",
      motion_url: `${FIXTURE_MEDIA_URL}/fixture-remote.mov`,
      created_at: "2027-01-01T00:00:00.000Z",
      taken_at: "2027-01-01T00:00:00.000Z",
      is_public: true,
    },
    {
      id: "fixture-deep-photo",
      user_id: "fixture-user",
      category: "日常",
      title: "Fixture deep diary",
      note: "用于验证深处媒体不提前激活",
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "live",
      motion_url: `${FIXTURE_MEDIA_URL}/fixture-deep.mov`,
      created_at: "2026-01-01T00:00:00.000Z",
      taken_at: "2026-01-01T00:00:00.000Z",
      is_public: true,
    },
    {
      id: "fixture-last-photo",
      user_id: "fixture-user",
      category: "旅行",
      title: "Fixture last diary",
      note: "用于验证列表末端媒体不提前激活",
      image_url: FIXTURE_IMAGE,
      thumbnail_url: FIXTURE_IMAGE,
      type: "live",
      motion_url: `${FIXTURE_MEDIA_URL}/fixture-last.mov`,
      created_at: "2025-01-01T00:00:00.000Z",
      taken_at: "2025-01-01T00:00:00.000Z",
      is_public: true,
    },
  ],
  recipes: [{ id: "fixture-recipe", user_id: "fixture-user", name: "Fixture recipe", ingredients: [], steps: [], created_at: "2030-01-01T00:00:00.000Z" }],
  wishes: [{ id: "fixture-wish", user_id: "fixture-user", title: "Fixture wish", is_done: false, sort_order: 0, created_at: "2030-01-01T00:00:00.000Z" }],
  shopping_items: [{ id: "fixture-shopping", user_id: "fixture-user", name: "Fixture shopping", is_completed: false, created_at: "2030-01-01T00:00:00.000Z" }],
  weekend_plans: [{ id: "fixture-weekend", user_id: "fixture-user", title: "Fixture weekend", plan_date: "2030-01-06", done: false, images: [], created_at: "2030-01-01T00:00:00.000Z" }],
  secret_items: [],
  secret_folders: [],
  photo_favorites: [],
  photo_comments: [{
    id: "fixture-comment",
    photo_id: "fixture-photo",
    user_id: "fixture-user",
    body: "Fixture comment",
    parent_id: null,
    created_at: "2030-01-02T00:00:00.000Z",
  }],
  notifications: [],
  gratitude_notes: [],
  anniversaries: [],
  wardrobe_items: [],
  wardrobe_locations: [],
  user_profiles: [{ user_id: "fixture-user", username: "fixture-user", experience_total: 0, recharge_total: 0 }],
  family_members: [],
  families: [],
  family_invitations: [],
  mood_diaries: [],
};

function cloneSeed({ seedSecretPhoto = false, notifications = tableSeeds.notifications } = {}) {
  const tables = new Map(Object.entries(tableSeeds).map(([table, rows]) => [table, rows.map((row) => ({ ...row }))]));
  tables.set("notifications", notifications.map((row) => ({ ...row })));
  if (seedSecretPhoto) {
    tables.set("secret_folders", [{
      id: "fixture-secret-folder",
      user_id: "fixture-user",
      name: "Fixture secret album",
      sort_order: 0,
      created_at: "2030-01-01T00:00:00.000Z",
      updated_at: "2030-01-01T00:00:00.000Z",
    }]);
    tables.set("secret_items", [{
      id: "fixture-secret-item",
      user_id: "fixture-user",
      folder_id: "fixture-secret-folder",
      title: "Fixture secret photo",
      category: "宠物",
      images: [{ image_url: FIXTURE_IMAGE, thumbnail_url: FIXTURE_IMAGE, tags: ["宠物"] }],
      created_at: "2030-01-01T00:00:00.000Z",
      updated_at: "2030-01-01T00:00:00.000Z",
    }]);
  }
  return tables;
}

function jsonResponse(request, body, status = 200) {
  const origin = request.headers().origin || "http://127.0.0.1";
  return {
    status,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-max-age": "86400",
      Vary: "Origin",
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function tableName(url) {
  return decodeURIComponent(url.pathname.replace("/api/table/", ""));
}

function rowsFor(table, tables) {
  return tables.get(table) || [];
}

function applyFilters(rows, url) {
  const raw = url.searchParams.get("filters");
  if (!raw) return rows;
  let filters = [];
  try { filters = JSON.parse(raw); } catch { return []; }
  return rows.filter((row) => filters.every(({ op, column, value }) => {
    if (op === "neq") return row[column] !== value;
    if (op === "gte") return row[column] >= value;
    if (op === "lt") return row[column] < value;
    return row[column] === value;
  }));
}

export function createCloudflareApiFixture({
  scenario = "ok",
  delayMs = 0,
  seedSecretPhoto = false,
  notifications = [],
  notificationDelayMs = 0,
  notificationFailureCount = 0,
  notificationFailureMode = "server",
} = {}) {
  const tables = cloneSeed({ seedSecretPhoto, notifications });
  const requests = [];
  const writes = [];
  const uploads = [];
  let generatedRowId = 0;
  let remainingNotificationFailures = Math.max(0, Number(notificationFailureCount) || 0);

  async function handle(route) {
    const request = route.request();
    const url = new URL(request.url());
    const requestRecord = { method: request.method(), path: url.pathname, search: url.search };
    requests.push(requestRecord);
    const isNotificationRpc = url.pathname === "/api/rpc/get_my_notifications";
    const requestDelayMs = isNotificationRpc ? notificationDelayMs || delayMs : delayMs;
    if (requestDelayMs || scenario === "slow-api") await new Promise((resolve) => setTimeout(resolve, requestDelayMs || 2500));
    if (scenario === "timeout") {
      await route.abort("timedout");
      return;
    }
    if (url.pathname.endsWith(".mp4")) {
      if (scenario === "video-error") {
        await route.fulfill(jsonResponse(request, { error: "fixture video unavailable" }, 503));
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { "content-type": "video/mp4", "cache-control": "no-store" },
        body: Buffer.from([0]),
      });
      return;
    }
    if (url.pathname.endsWith(".mov")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "video/quicktime", "cache-control": "no-store" },
        body: Buffer.from([0]),
      });
      return;
    }
    if (scenario === "api-500") {
      await route.fulfill(jsonResponse(request, { error: "fixture server error" }, 500));
      return;
    }
    if (isNotificationRpc && request.method() !== "OPTIONS" && remainingNotificationFailures > 0) {
      remainingNotificationFailures -= 1;
      if (notificationFailureMode === "offline") {
        await route.abort("internetdisconnected");
      } else {
        await route.fulfill(jsonResponse(request, { error: "fixture notification failure" }, 503));
      }
      return;
    }
    if (scenario === "weekend-upsert-500" && request.method() === "POST" && url.pathname === "/api/table/weekend_plans") {
      await route.fulfill(jsonResponse(request, { error: "fixture weekend save failed" }, 500));
      return;
    }
    if (request.method() === "OPTIONS") {
      await route.fulfill(jsonResponse(request, {}, 204));
      return;
    }
    if (scenario === "authenticated-401" && request.headers().authorization) {
      await route.fulfill(jsonResponse(request, { error: "Unauthorized." }, 401));
      return;
    }
    if (url.pathname === "/health" || url.pathname === "/api/d1/status") {
      await route.fulfill(jsonResponse(request, { ok: true, d1: true }));
      return;
    }
    if (url.pathname === "/api/auth/login") {
      await route.fulfill(jsonResponse(request, {
        token: "fixture-token",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        user: { id: "fixture-user", username: "fixture-user", email: "fixture-user@life-vlog.local" },
        profile: { username: "Fixture User" },
      }));
      return;
    }
    if (url.pathname === "/api/auth/me") {
      await route.fulfill(jsonResponse(request, { data: { id: "fixture-user", username: "fixture-user", email: "fixture-user@life-vlog.local" } }));
      return;
    }
    if (url.pathname === "/api/push/config") {
      await route.fulfill(jsonResponse(request, { data: { publicKey: "" } }));
      return;
    }
    if (url.pathname === "/upload" && request.method() === "POST") {
      uploads.push({ method: request.method(), path: url.pathname });
      await route.fulfill(jsonResponse(request, {
        key: `fixture-user/photos/fixture-upload-${uploads.length}.jpg`,
        url: `https://pub-47959f26cde042c3b37bc0f8f3f441ce.r2.dev/fixture-user/photos/fixture-upload-${uploads.length}.jpg`,
        size: request.postDataBuffer()?.length || 0,
        contentType: "image/jpeg",
      }));
      return;
    }
    if (url.pathname.startsWith("/api/table/")) {
      const table = tableName(url);
      if (request.method() === "GET") {
        const responseRows = applyFilters(rowsFor(table, tables), url);
        requestRecord.responseRows = responseRows.length;
        await route.fulfill(jsonResponse(request, { data: responseRows }));
        return;
      }
      const payload = request.postDataJSON() || {};
      writes.push({ path: url.pathname, action: payload.action || "unknown" });
      const rows = rowsFor(table, tables);
      const values = Array.isArray(payload.values) ? payload.values : [payload.values];
      const normalizedValues = values.filter(Boolean).map((value) => ({
        ...value,
        ...(value.id ? {} : { id: `fixture-${table}-${++generatedRowId}` }),
      }));
      let responseData = normalizedValues;
      if (payload.action === "delete") {
        const filters = payload.filters || [];
        const kept = rows.filter((row) => !filters.every(({ op, column, value }) => op !== "neq" && row[column] === value));
        tables.set(table, kept);
      } else if (payload.action === "insert" || payload.action === "upsert") {
        for (const value of normalizedValues) {
          const index = rows.findIndex((row) => row.id && row.id === value.id);
          if (index >= 0) rows[index] = { ...rows[index], ...value };
          else rows.push({ ...value });
        }
      } else if (payload.action === "update") {
        responseData = [];
        for (const row of rows) {
          if ((payload.filters || []).every(({ column, value }) => row[column] === value)) {
            Object.assign(row, payload.values || {});
            responseData.push({ ...row });
          }
        }
      }
      await route.fulfill(jsonResponse(request, { data: responseData }));
      return;
    }
    if (url.pathname.startsWith("/api/rpc/")) {
      const name = decodeURIComponent(url.pathname.replace("/api/rpc/", ""));
      if (name === "admin_delete_photo") {
        const payload = request.postDataJSON() || {};
        const photoId = String(payload.p_photo_id || payload.photo_id || "");
        const photos = rowsFor("photos", tables);
        const index = photos.findIndex((row) => row.id === photoId);
        const removed = index >= 0 ? photos.splice(index, 1)[0] : null;
        if (removed) {
          const comments = rowsFor("photo_comments", tables).filter((row) => row.photo_id !== photoId);
          tables.set("photo_comments", comments);
        }
        writes.push({ path: url.pathname, action: name });
        await route.fulfill(jsonResponse(request, { data: removed ? [removed] : [] }));
        return;
      }
      if (name === "get_my_notifications") await route.fulfill(jsonResponse(request, { data: rowsFor("notifications", tables) }));
      else await route.fulfill(jsonResponse(request, { data: [] }));
      return;
    }
    await route.fulfill(jsonResponse(request, { data: [] }));
  }

  return {
    async install(context) {
      await context.route("**/*", (route) => {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.origin === new URL(WORKER_URL).origin || requestUrl.pathname.startsWith(`${FIXTURE_MEDIA_URL}/`)) return handle(route);
        return route.continue();
      });
    },
    requests,
    writes,
    uploads,
    async dispose(context) {
      await context.unroute("**/*");
    },
  };
}

export const cloudflareFixtureWorkerUrl = WORKER_URL;
