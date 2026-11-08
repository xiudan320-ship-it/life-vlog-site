const float = Math.fround;
const types = [1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 42];
const flatValues = [150, 68, 150, 109, 33, 41, 116, 75];

export function rollParagonEquipment({ level, paragon, fixedAttributes = [], draw }) {
  const roll = draw();
  const paragonGrowth = paragon === 800 ? 800 : Math.max(30, Math.min(800, paragon - 5 + roll % 11));
  const effectiveLevel = Math.trunc(float(float(level) + float(float(paragonGrowth) / float(6))));
  const attributes = fixedAttributes.map((attribute) => [...attribute]);
  while (attributes.length < 5) {
    const type = types[draw() % types.length];
    if (attributes.some(([old]) => old === type)) continue;
    let value;
    if (type <= 8) {
      const roll = draw() % 20 + 1;
      const base = float(float(Math.imul(flatValues[type - 1], effectiveLevel)) * float(0.03));
      value = Math.max(1, Math.trunc(float(base * float(float(float(roll) * float(0.01)) + float(1)))));
    } else {
      const [min, max] = type === 42 ? [2, 4] : [6, 12];
      value = min + draw() % (max - min + 1);
    }
    attributes.push([type, value]);
  }
  return { paragonGrowth, attributes };
}
