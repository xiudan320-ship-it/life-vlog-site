function requireDatabase(getDatabase) {
  const database = getDatabase?.();
  if (!database) throw new Error("Cloudflare 数据库尚未连接。");
  return database;
}

export function createDiaryRepository({ getDatabase, getSession }) {
  return {
    async list({ includePrivate = true } = {}) {
      const database = requireDatabase(getDatabase);
      let query = database.from("photos").select("*");
      if (!includePrivate) query = query.eq("is_public", true);
      return query
        .order("taken_at", { ascending: false })
        .order("created_at", { ascending: false });
    },
    async getById(id) {
      return requireDatabase(getDatabase).from("photos").select("*").eq("id", id).single();
    },
    async listRecent(fields = "*", limit = 12) {
      return requireDatabase(getDatabase)
        .from("photos")
        .select(fields)
        .order("created_at", { ascending: false })
        .limit(limit);
    },
    async verifyFlags() {
      return requireDatabase(getDatabase)
        .from("photos")
        .select("id,is_featured,is_pinned")
        .limit(1);
    },
    async insert(record) {
      return requireDatabase(getDatabase).from("photos").insert(record);
    },
    async update(id, updates) {
      return requireDatabase(getDatabase).from("photos").update(updates).eq("id", id);
    },
    async updateOwned(id, updates, { select = "", single = false } = {}) {
      const userId = getSession?.()?.user?.id;
      let query = requireDatabase(getDatabase).from("photos").update(updates).eq("id", id);
      if (userId) query = query.eq("user_id", userId);
      if (select) query = query.select(select);
      if (single) query = query.single();
      return query;
    },
    async remove(id, { select = "" } = {}) {
      const userId = getSession?.()?.user?.id;
      let query = requireDatabase(getDatabase).from("photos").delete().eq("id", id);
      if (userId) query = query.eq("user_id", userId);
      if (select) query = query.select(select);
      return query;
    },
    async listComments(photoId) {
      return requireDatabase(getDatabase)
        .from("photo_comments")
        .select("*")
        .eq("photo_id", photoId)
        .order("created_at", { ascending: true });
    },
    async listCommentPreviews(limit = 300) {
      return requireDatabase(getDatabase)
        .from("photo_comments")
        .select("id,photo_id,user_id,body,parent_id,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
    },
    async addComment(record) {
      return requireDatabase(getDatabase).from("photo_comments").insert(record);
    },
    async removeComment(id) {
      const userId = getSession?.()?.user?.id;
      let query = requireDatabase(getDatabase).from("photo_comments").delete().eq("id", id);
      if (userId) query = query.eq("user_id", userId);
      return query;
    },
    async setFavorite(photoId, favorite) {
      const database = requireDatabase(getDatabase);
      const userId = getSession?.()?.user?.id;
      if (!userId) throw new Error("请先登录。");
      if (favorite) {
        return database.from("photo_favorites").insert({ user_id: userId, photo_id: photoId });
      }
      return database
        .from("photo_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("photo_id", photoId);
    },
    async listFavorites() {
      const userId = getSession?.()?.user?.id;
      if (!userId) return { data: [], error: null };
      return requireDatabase(getDatabase)
        .from("photo_favorites")
        .select("photo_id")
        .eq("user_id", userId);
    },
    async upsertFavorites(photoIds) {
      const userId = getSession?.()?.user?.id;
      const ids = [...new Set((photoIds || []).filter(Boolean))];
      if (!userId || !ids.length) return { data: [], error: null };
      return requireDatabase(getDatabase)
        .from("photo_favorites")
        .upsert(
          ids.map((photoId) => ({ user_id: userId, photo_id: photoId })),
          { onConflict: "user_id,photo_id" }
        );
    },
  };
}

export function createSecretRepository({ getDatabase, getSession }) {
  return {
    async listItems() {
      return requireDatabase(getDatabase)
        .from("secret_items")
        .select("*")
        .order("created_at", { ascending: false });
    },
    async listFolders() {
      return requireDatabase(getDatabase)
        .from("secret_folders")
        .select("*")
        .order("sort_order", { ascending: true });
    },
    async insertItem(record) {
      return requireDatabase(getDatabase).from("secret_items").insert(record);
    },
    async insertFolder(record, { select = "", single = false } = {}) {
      let query = requireDatabase(getDatabase).from("secret_folders").insert(record);
      if (select) query = query.select(select);
      if (single) query = query.single();
      return query;
    },
    async updateFolder(id, updates) {
      const userId = getSession?.()?.user?.id;
      let query = requireDatabase(getDatabase)
        .from("secret_folders")
        .update(updates)
        .eq("id", id);
      if (userId) query = query.eq("user_id", userId);
      return query;
    },
    async removeFolder(id) {
      const userId = getSession?.()?.user?.id;
      let query = requireDatabase(getDatabase)
        .from("secret_folders")
        .delete()
        .eq("id", id);
      if (userId) query = query.eq("user_id", userId);
      return query;
    },
    async updateItem(id, updates) {
      return requireDatabase(getDatabase).from("secret_items").update(updates).eq("id", id);
    },
    async updateOwnedItem(id, updates) {
      const userId = getSession?.()?.user?.id;
      let query = requireDatabase(getDatabase)
        .from("secret_items")
        .update(updates)
        .eq("id", id);
      if (userId) query = query.eq("user_id", userId);
      return query;
    },
    async removeItem(id) {
      const userId = getSession?.()?.user?.id;
      let query = requireDatabase(getDatabase).from("secret_items").delete().eq("id", id);
      if (userId) query = query.eq("user_id", userId);
      return query;
    },
  };
}

export function createNotificationRepository({ getDatabase }) {
  return {
    async list(limit = 50) {
      return requireDatabase(getDatabase).rpc("get_my_notifications", { p_limit: limit });
    },
    async markRead(id) {
      return requireDatabase(getDatabase)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    },
    async markDiaryRead(userId, photoId) {
      return requireDatabase(getDatabase)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("photo_id", photoId)
        .eq("type", "diary")
        .eq("is_read", false);
    },
    async markManyRead(ids) {
      const normalized = [...new Set((ids || []).filter(Boolean))];
      if (!normalized.length) return { data: [], error: null };
      return requireDatabase(getDatabase)
        .from("notifications")
        .update({ is_read: true })
        .in("id", normalized);
    },
    async markAllUnread(userId) {
      return requireDatabase(getDatabase)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
    },
  };
}

export function createWardrobeRepository({ getDatabase }) {
  const table = (name) => requireDatabase(getDatabase).from(name);

  return {
    async listItems() {
      return table("wardrobe_items")
        .select("*")
        .order("updated_at", { ascending: false });
    },
    async insertItem(record) {
      return table("wardrobe_items").insert(record).select("*").single();
    },
    async updateItem(id, updates) {
      return table("wardrobe_items").update(updates).eq("id", id).select("*").single();
    },
    async removeItem(id) {
      return table("wardrobe_items").delete().eq("id", id).select("*");
    },
    async listLocations() {
      return table("wardrobe_locations")
        .select("*")
        .order("sort_order", { ascending: true });
    },
    async insertLocation(record) {
      return table("wardrobe_locations").insert(record).select("*").single();
    },
    async updateLocation(id, updates) {
      return table("wardrobe_locations").update(updates).eq("id", id).select("*").single();
    },
    async removeLocation(id) {
      return table("wardrobe_locations").delete().eq("id", id).select("*");
    },
    async listWearLogs(limit = 200) {
      return table("wardrobe_wear_logs")
        .select("*")
        .order("worn_on", { ascending: false })
        .limit(limit);
    },
    async insertWearLog(record) {
      return table("wardrobe_wear_logs").insert(record).select("*").single();
    },
  };
}
