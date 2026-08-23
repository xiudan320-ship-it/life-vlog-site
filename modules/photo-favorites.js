export function normalizeFavoritePhotoId(value) {
  return String(value ?? "").trim();
}

export function createPhotoFavoritesStore({ repository, logger = console } = {}) {
  if (!repository) throw new TypeError("Photo favorites repository is required.");

  let ids = new Set();
  let dataState = "idle";
  let cloudAvailable = false;

  function has(photoOrId) {
    const id = normalizeFavoritePhotoId(
      typeof photoOrId === "object" ? photoOrId?.id : photoOrId
    );
    return Boolean(id && ids.has(id));
  }

  function reset(nextState = "idle") {
    ids = new Set();
    dataState = nextState;
    cloudAvailable = false;
  }

  function markError({ clear = false } = {}) {
    if (clear) ids = new Set();
    dataState = "error";
    cloudAvailable = false;
  }

  async function synchronize() {
    try {
      const { data, error } = await repository.listFavorites();
      if (error) throw error;
      ids = new Set(
        (data || [])
          .map((row) => normalizeFavoritePhotoId(row.photo_id))
          .filter(Boolean)
      );
      dataState = "ready";
      cloudAvailable = true;
      return { data: [...ids], error: null };
    } catch (error) {
      markError({ clear: true });
      logger?.warn?.("Favorite sync failed:", error);
      return { data: [], error };
    }
  }

  async function toggle(photoOrId) {
    const id = normalizeFavoritePhotoId(
      typeof photoOrId === "object" ? photoOrId?.id : photoOrId
    );
    if (!id) return { favorite: false, error: new Error("Photo id is required.") };

    const favorite = !has(id);
    try {
      const result = await repository.setFavorite(id, favorite);
      if (result?.error) throw result.error;
      ids[favorite ? "add" : "delete"](id);
      dataState = "ready";
      cloudAvailable = true;
      return { favorite, error: null };
    } catch (error) {
      markError();
      return { favorite: !favorite, error };
    }
  }

  function remove(photoOrId) {
    const id = normalizeFavoritePhotoId(
      typeof photoOrId === "object" ? photoOrId?.id : photoOrId
    );
    if (id) ids.delete(id);
  }

  return {
    has,
    markError,
    remove,
    reset,
    sortedIds: () => [...ids].sort(),
    synchronize,
    toggle,
    get cloudAvailable() {
      return cloudAvailable;
    },
    get size() {
      return ids.size;
    },
    get status() {
      return dataState;
    },
  };
}
