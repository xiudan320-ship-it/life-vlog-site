const ROUTES = new Set([
  "gallery",
  "recipes",
  "wishlist",
  "weekend",
  "wardrobe",
  "thanks",
  "secret",
  "mood",
]);

export function normalizePage(value) {
  const page = String(value || "").trim().toLowerCase();
  return ROUTES.has(page) ? page : "gallery";
}
export function parseRoute(locationLike = globalThis.location) {
  const params = new URL(locationLike?.href || locationLike || "http://localhost/").searchParams;
  const rawPage = params.get("page");
  return {
    page: normalizePage(rawPage),
    hasPage: params.has("page"),
  };
}

export function serializeRoute(page, currentUrl = globalThis.location?.href || "/") {
  const url = new URL(currentUrl, "http://localhost/");
  const normalizedPage = normalizePage(page);
  if (normalizedPage === "gallery") url.searchParams.delete("page");
  else url.searchParams.set("page", normalizedPage);
  return `${url.pathname}${url.search}${url.hash}`;
}
