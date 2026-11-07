// GameData::getBaseCopyById (0x7ca8f0) and Copy::getDrops (0x7acc64).
// Selects item IDs only. Item construction, stack merge and equipment rolls
// remain separate operations and must consume their own original RNG draws.
const float = Math.fround;
const ordinaryGroups = Object.freeze([
  ["percent300", 2400], ["percent100", 750], ["percent10", 75],
  ["percent2", 15], ["percent1", 7],
]);

function requireRoll(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0x7fffffff) {
    throw new TypeError("Loot selection requires explicit original RNG outputs.");
  }
  return value;
}

function readIds(raw) {
  const values = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (values == null) return [];
  if (!Array.isArray(values) || !values.every(Number.isInteger)) {
    throw new TypeError("A copy drop group must contain integer item IDs.");
  }
  return [...values];
}

/** Prepare the original six drop groups, including generated material entries. */
export function prepareCopyDropGroups({ copy, roll }) {
  const groups = Object.fromEntries([...ordinaryGroups.map(([key]) => key), "paragondrop10"]
    .map((key) => [key, readIds(copy[key])]));
  let count = 0;
  if (copy.type === 1) count = Math.trunc(copy.level / 10) + 3 + requireRoll(roll) % 3;
  if (copy.type === 2) count = Math.trunc(copy.level / 5) + 5 + requireRoll(roll) % 4;
  groups.percent300.unshift(...Array(count).fill(5003));
  return groups;
}

/** Return successful drop IDs in native order and the RNG draw count. */
export function selectCopyDropIds({ groups, copyType, hard, activityEnabled, dropRate, rolls }) {
  const rate = float(float(dropRate) / float(100));
  let rollsUsed = 0;
  const draw = () => requireRoll(rolls?.[rollsUsed++]);
  const itemIds = [];
  for (const [key, baseThreshold] of ordinaryGroups) {
    for (const id of groups[key] || []) {
      let value = draw() % 10001;
      if (key === "percent1" && id === 6865) {
        if (copyType === 1) value = draw() % 500001;
        if (copyType === 2) value = draw() % 20001;
      }
      if (float(value) >= float(rate * float(baseThreshold))) continue;
      if (id === 5100 && ["percent300", "percent100", "percent10"].includes(key) && !activityEnabled) continue;
      itemIds.push(id);
    }
  }
  if (hard > 3) {
    for (const id of groups.paragondrop10 || []) {
      const value = draw() % 10001;
      let threshold = Math.trunc(float(rate * float(30)));
      if (copyType === 1) threshold = Math.trunc(float(float(threshold) * float(id === 6865 ? 0.02 : 0.2)));
      if (value < threshold) itemIds.push(id);
    }
  }
  return { itemIds, rollsUsed };
}

/** Construct and merge material drops; equipment construction is a separate rule. */
export function createMaterialDrops({ itemIds, items }) {
  const drops = [];
  for (const id of itemIds) {
    const row = items.find((item) => item.id === id);
    if (!row || row.type !== 1) throw new RangeError(`Expected original material catalog record ${id}.`);
    const existing = drops.find((item) => item.id === id);
    if (existing) existing.quantity = (existing.quantity + 1) | 0;
    else drops.push({ id, type: 1, quantity: 1 });
  }
  return drops;
}
