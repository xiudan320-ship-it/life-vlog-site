import { calculateEquipmentMainAttribute } from "./equipment-domain.js";
import { rollGemEquipment } from "./gem-domain.js";
import { rollParagonEquipment } from "./paragon-equipment-domain.js";

const float = Math.fround;
const godTypes = [16, 17, 23, 24, 25, 26, 27, 19, 9, 10];
const godValues = [1, 1, 1, 5, 1, 1, 2, 5, 2, 5];

export function rollEquipmentScore(draw) {
  const tierRoll = draw() % 100 + 1;
  const scoreTier = tierRoll <= 29 ? 1 : tierRoll <= 64 ? 2 : tierRoll <= 92 ? 3 : 4;
  const rangeRoll = draw() % 100 + 1;
  const [min, max] = rangeRoll <= 25 ? [1, 30] : rangeRoll <= 50 ? [30, 50]
    : rangeRoll <= 75 ? [50, 70] : rangeRoll <= 90 ? [70, 80]
      : rangeRoll <= 95 ? [80, 90] : rangeRoll <= 98 ? [90, 95] : [95, 100];
  return { scoreTier, scoreValue: min + draw() % (max - min + 1) };
}

export function rollGodEquipment({ mode, mainValue, draw }) {
  const roll = draw() % 101;
  const stars = mode <= 3 ? mode : mode === 4 ? Number(roll > 70)
    : mode === 5 ? roll > 80 ? 2 : roll > 55 ? 1 : 0
      : mode === 6 ? roll > 90 ? 3 : roll > 75 ? 2 : roll > 55 ? 1 : 0
        : roll > 85 ? 3 : roll > 50 ? 2 : 1;
  if (!stars) return { quality: 5, godLevel: 0, godOffset: 0, attributes: [] };
  const offsetRoll = draw() % 101 < 70 ? 1 + draw() % 30 : 30 + draw() % 11;
  const godOffset = Math.trunc(float(float(float(Math.imul(mainValue, stars * 20 + offsetRoll)) / float(100)) * float(0.1)));
  const attributes = [];
  while (attributes.length < stars) {
    const index = draw() % godTypes.length;
    if (!attributes.some(([type]) => type === godTypes[index])) attributes.push([godTypes[index], godValues[index]]);
  }
  return { quality: 6, godLevel: stars, godOffset, attributes };
}

/** Native catalog factory's fixed tags are captured with the original CSJson parser. */
export function createCatalogEquipment({ row, template, scoreTier = 4, scoreValue = 50, god = null, paragon = null }) {
  const special = row.subtype >= 9;
  const main = special ? template.main : [row.maintype, calculateEquipmentMainAttribute({
    scoreTier, scoreValue, mainValue: row.mainvalue, strength: 0, godOffset: god?.godOffset || 0,
    paragonEquipment: Boolean(row.paragon), paragonGrowth: paragon?.paragonGrowth || 0,
  })];
  const attributes = row.subtype <= 8 ? [...(paragon ? paragon.attributes : template.baseAttributes), ...(god?.attributes || [])]
    : row.subtype === 9 ? template.baseAttributes : [];
  return {
    id: row.id, type: 2, subtype: row.subtype, quality: god?.quality || row.quality, level: row.level,
    scoreTier, scoreValue, strength: 0, equipped: false,
    mainAttribute: { type: main[0], value: main[1] },
    secondaryAttribute: { type: template.sub[0], value: template.sub[1] },
    attributes: attributes.map(([type, value]) => ({ type, value })),
    ...(god ? { godLevel: god.godLevel, godOffset: god.godOffset } : {}),
    ...(paragon ? { paragonGrowth: paragon.paragonGrowth } : {}),
  };
}

export function createCopyDrops({ itemIds, catalog, copy, player, draw }) {
  const drops = [];
  for (const id of itemIds) {
    const row = catalog.items.find((item) => item.id === id);
    if (!row) throw new RangeError(`缺少原版物品 ${id}`);
    if (row.type === 1) {
      const existing = drops.find((item) => item.id === id && item.type === 1);
      if (existing) existing.quantity += 1;
      else drops.push({ id, type: 1, quantity: 1 });
      continue;
    }
    if (row.subtype > 10 && row.subtype < 15) {
      const gem = rollGemEquipment({ level: player.level, paragon: player.paragon, draw });
      drops.push({ ...createCatalogEquipment({ row, template: catalog.equipmentTemplates[id] }),
        level: gem.level, quality: gem.quality, paragonGrowth: gem.paragonGrowth,
        attributes: gem.baseAttributes.map(([type, value]) => ({ type, value })) });
      continue;
    }
    const score = row.subtype === 9 ? { scoreTier: 4, scoreValue: 50 } : rollEquipmentScore(draw);
    let god = null;
    if (row.subtype !== 9 && row.quality === 5 && [1, 2, 4, 5, 6].includes(copy.type)) god = rollGodEquipment({ mode: copy.type === 2 && copy.id <= 2100 ? 4 : 6, mainValue: row.mainvalue, draw });
    const paragon = row.paragon ? rollParagonEquipment({ level: row.level, paragon: player.paragon, fixedAttributes: catalog.equipmentTemplates[id].attributes, draw }) : null;
    drops.push(createCatalogEquipment({ row, template: catalog.equipmentTemplates[id], ...score, god, paragon }));
  }
  return drops;
}
