const routeImports = {
  gallery: () => import("./routes/gallery-route.js"),
  recipes: () => import("./routes/recipes-route.js"),
  wishlist: () => import("./routes/wishlist-route.js"),
  weekend: () => import("./routes/weekend-route.js"),
  wardrobe: () => import("./routes/wardrobe-route.js"),
  secret: () => import("./routes/secret-route.js"),
  mood: () => import("./routes/mood-diary-route.js"),
  settings: () => import("./routes/settings-route.js"),
};

export function createRouteLoader({ imports = routeImports } = {}) {
  const modules = new Map();
  const initializations = new Map();
  const mounts = new Map();
  const collections = new Map();
  const bindings = new Map();

  async function resolveRouteContext(route, context) {
    if (route.requiresControllerOptions !== true || typeof context.getControllerOptions !== "function") {
      return context;
    }
    return {
      ...context,
      controllerOptions: await context.getControllerOptions(),
    };
  }

  async function load(page, context = {}) {
    const loadRoute = imports[page] || imports.gallery;
    if (!modules.has(page)) {
      const modulePromise = Promise.resolve().then(() => loadRoute());
      modules.set(page, modulePromise);
      modulePromise.catch(() => {
        if (modules.get(page) === modulePromise) modules.delete(page);
      });
    }
    const route = await modules.get(page);
    if (!mounts.has(page)) {
      const mountPromise = Promise.resolve().then(() => route.mount?.(context));
      mounts.set(page, mountPromise);
      mountPromise.catch(() => {
        if (mounts.get(page) === mountPromise) mounts.delete(page);
      });
    }
    await mounts.get(page);
    if (!collections.has(page)) {
      const collectPromise = Promise.resolve().then(() => context.collect?.(page));
      collections.set(page, collectPromise);
      collectPromise.catch(() => {
        if (collections.get(page) === collectPromise) collections.delete(page);
      });
    }
    await collections.get(page);
    const routeContext = await resolveRouteContext(route, context);
    if (!initializations.has(page)) {
      const initializePromise = Promise.resolve().then(() => route.initialize?.(routeContext));
      initializations.set(page, initializePromise);
      initializePromise.catch(() => {
        if (initializations.get(page) === initializePromise) initializations.delete(page);
      });
    }
    await initializations.get(page);
    if (!bindings.has(page)) {
      const bindPromise = Promise.resolve().then(() => (
        route.bind ? route.bind(routeContext) : routeContext.bindRouteEvents?.(page)
      ));
      bindings.set(page, bindPromise);
      bindPromise.catch(() => {
        if (bindings.get(page) === bindPromise) bindings.delete(page);
      });
    }
    await bindings.get(page);
    if (typeof context.isCurrent === "function" && !context.isCurrent()) return route;
    await route.activate?.(routeContext);
    return route;
  }

  return {
    load,
    isLoaded: (page) => modules.has(page) && mounts.has(page) && initializations.has(page) && bindings.has(page),
    getLoadedPages: () => [...modules.keys()].filter((page) => mounts.has(page)),
  };
}
