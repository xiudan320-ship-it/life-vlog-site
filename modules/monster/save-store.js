// Local port save format. This does not import or emulate the Android encrypted save.
const key = "monster-save-7.1";

function validateState(state) {
  if (!state || !state.player || !Array.isArray(state.player.equipmentSets)
    || !Array.isArray(state.player.skills) || !state.inventory || !state.progress
    || !Number.isInteger(state.gold) || !Number.isInteger(state.player.level)
    || !Number.isInteger(state.player.experience)) {
    throw new TypeError("Invalid Monster game state.");
  }
}

export function createMonsterSaveStore({ storage }) {
  return {
    load() {
      const text = storage.getItem(key);
      if (text === null) return null;
      const saved = JSON.parse(text);
      if (saved.game !== "com.zn.monster" || saved.version !== "7.1") {
        throw new TypeError("Unsupported Monster save format.");
      }
      validateState(saved.state);
      return saved.state;
    },
    save(state) {
      validateState(state);
      // Serialize fully before changing the stored value. Quota/write errors
      // propagate so the controller can show failure and keep its in-memory state.
      storage.setItem(key, JSON.stringify({ game: "com.zn.monster", version: "7.1", state }));
    },
  };
}
