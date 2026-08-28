export function createLazyControllerProxy(registry, page) {
  const getController = () => registry[page] || null;
  return new Proxy({}, {
    get(_target, property) {
      if (property === "get") return getController;
      if (property === "isLoaded") return Boolean(getController());
      if (property === "page") return page;
      if (typeof property === "symbol") return undefined;
      return (...args) => {
        const controller = getController();
        if (!controller) throw new Error(`Page controller "${page}" is not loaded`);
        const method = controller[property];
        if (typeof method !== "function") throw new Error(`Unknown method "${String(property)}" on page controller "${page}"`);
        return method.apply(controller, args);
      };
    },
  });
}
