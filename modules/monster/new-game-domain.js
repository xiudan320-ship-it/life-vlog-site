import { calculatePlayerCoreAttributes, collectEquipmentAttributes } from "./attribute-domain.js";
import { calculateEquipmentMainAttribute } from "./equipment-domain.js";

// GameData::parsePlayerSave fresh-save branch (0x7ddd8c onward).
// Catalog rows are the decoded APK tables; platform identity is owned elsewhere.
const starterEquipmentIds = Object.freeze([6001, 6101, 6201, 6301, 6401, 6501, 6601, 6701]);

export function createNewGame({ items, skills }) {
  const find = (rows, id) => {
    const row = rows.find((entry) => entry.id === id);
    if (!row) throw new RangeError(`Missing original catalog record ${id}.`);
    return row;
  };
  function equipment(id, wing = false) {
    const row = find(items, id);
    const mainValue = wing ? row.mainvalue : calculateEquipmentMainAttribute({
      scoreTier: 4, scoreValue: 100, mainValue: row.mainvalue, strength: 0,
    });
    return {
      id, type: row.type, subtype: row.subtype, quality: row.quality, level: row.level,
      scoreTier: 4, scoreValue: wing ? 50 : 100, strength: 0, equipped: !wing,
      mainAttribute: { type: row.maintype, value: mainValue },
      secondaryAttribute: wing ? { type: 3, value: row.subvalue } : { type: 0, value: 0 },
      attributes: [],
    };
  }
  const equipmentSets = [starterEquipmentIds.map((id) => equipment(id)), [], []];
  const wing = equipment(6901, true);
  const attributes = collectEquipmentAttributes([...equipmentSets[0], wing]);
  return {
    player: {
      name: "", image: "ani/2001.png", level: 1, paragon: 1, experience: 0,
      hp: 0, dead: false,
      ...calculatePlayerCoreAttributes({ level: 1, paragon: 1, attributes }),
      equipmentSets, equipmentSetIndex: 0, wingId: 6901,
      skills: Array.from({ length: 17 }, (_, index) => {
        const row = find(skills, index + 1);
        return { id: row.id, locked: false, cooldownRounds: 0 };
      }),
      equippedSkillIds: [],
    },
    gold: 1000, money: 10,
    inventory: { equipment: [], goods: [], wings: [wing], pets: [] },
    gemSlots: Array(8).fill(0),
    progress: { chapterId: 1, levelId: 1, newChapter: true, finished: false, copies: [{ id: 16002, value: 1 }], special: [] },
  };
}
