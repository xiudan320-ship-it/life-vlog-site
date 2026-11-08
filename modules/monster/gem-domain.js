const float = Math.fround;
const types = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 19, 21, 22, 33, 40, 43];
const flatValues = [150, 68, 150, 109, 33, 41, 116, 75];
const ranges = { 9: [3, 6], 10: [3, 6], 12: [5, 10], 13: [5, 10], 14: [5, 10], 19: [3, 6], 21: [3, 6], 22: [3, 6], 33: [2, 5], 40: [2, 4], 43: [2, 5] };

/** GameEquipment::makeGemEquip with its original default arguments. */
export function rollGemEquipment({ level, paragon, draw }) {
  const paragonGrowth = paragon === 800 ? (draw(), 800) : Math.min(800, Math.max(30, paragon - 5 + draw() % 11));
  const rolledLevel = level === 80 ? (draw(), 80) : Math.min(80, Math.max(30, level - 3 + draw() % 7));
  const value = draw() % 92;
  const quality = value <= 30 ? 2 : value <= 60 ? 3 : value <= 75 ? 4 : value <= 85 ? 5 : 6;
  const attributes = [];
  const effectiveLevel = Math.trunc(float(float(rolledLevel) + float(float(paragonGrowth) / float(6))));
  while (attributes.length < quality + 2) {
    const type = types[draw() % types.length];
    if (type > 8 && attributes.some(([old]) => old === type)) continue;
    let value;
    if (type <= 8) {
      const roll = draw() % 20 + 1;
      const base = float(float(Math.imul(flatValues[type - 1], effectiveLevel)) * float(0.015));
      value = Math.max(1, Math.trunc(float(base * float(float(float(roll) * float(0.01)) + float(1)))));
    } else {
      const [min, max] = ranges[type]; value = min + draw() % (max - min + 1);
    }
    attributes.push([type, value]);
  }
  return { level: rolledLevel, quality, paragonGrowth, attributes: [], baseAttributes: attributes };
}
