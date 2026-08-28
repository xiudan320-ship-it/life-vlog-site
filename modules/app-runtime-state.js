/**
 * Live access boundary for the runtime's shared mutable state.
 *
 * Controllers receive this object instead of reaching into the application
 * assembly's local variables. Accessors stay live across login, sync, and
 * route changes; no state snapshot is copied into a feature module.
 */
export function createRuntimeStateAccessors(bindings) {
  const state = {};
  for (const [name, binding] of Object.entries(bindings)) {
    Object.defineProperty(state, name, {
      configurable: false,
      enumerable: true,
      get: binding.get,
      set: binding.set,
    });
  }
  return Object.freeze(state);
}

export function createRuntimeStateView(state, names) {
  const view = {};
  for (const name of names) {
    Object.defineProperty(view, name, {
      configurable: false,
      enumerable: true,
      get: () => state[name],
      set: (value) => { state[name] = value; },
    });
  }
  return Object.freeze(view);
}
