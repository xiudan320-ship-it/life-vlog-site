export function createRouteControllerOptionsLoader(context) {
  let optionsPromise = null;
  return () => {
    optionsPromise ||= import("./routes/controller-options.js")
      .then(({ createRouteControllerOptions }) => createRouteControllerOptions(context));
    return optionsPromise;
  };
}

export function createAppRouteContext({
  elements, documentTarget = document, collectRouteElements,
  bindRouteEvents, performanceMonitor, health, getControllerOptions,
}) {
  const collect = (page) => {
    if (!page || page === "gallery" || page === "settings") return elements;
    Object.assign(elements, collectRouteElements(page, documentTarget));
    return elements;
  };
  return {
    elements,
    outlet: elements.routeOutlet,
    collect,
    bindRouteEvents,
    performanceMonitor,
    health,
    getControllerOptions,
  };
}
