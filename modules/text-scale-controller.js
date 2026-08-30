const SCALE_VALUES = Object.freeze({ standard: 1, large: 1.15, xlarge: 1.3 });
const SCALE_NAMES = Object.freeze(Object.keys(SCALE_VALUES));

export function createTextScaleController({
  preferenceStore,
  storageKey = "life-vlog-text-scale",
  getScope = () => "guest",
  documentTarget = globalThis.document,
} = {}) {
  function normalize(value) {
    return SCALE_NAMES.includes(value) ? value : "standard";
  }

  function load(scope = getScope()) {
    return normalize(preferenceStore.readScoped(storageKey, scope, "standard"));
  }

  function apply(value) {
    const scale = normalize(value);
    documentTarget?.documentElement?.setAttribute("data-text-scale", scale);
    return scale;
  }

  function set(value, scope = getScope()) {
    const scale = apply(value);
    preferenceStore.writeScoped(storageKey, scope, scale);
    return scale;
  }

  function options() {
    return SCALE_NAMES.map((id) => ({ id, multiplier: SCALE_VALUES[id] }));
  }

  return { apply, load, normalize, options, set };
}
