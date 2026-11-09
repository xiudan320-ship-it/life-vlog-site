import { withEquipmentStrength } from "./equipment-domain.js";

export function toggleEquippedSkill(state, skillId, skills) {
  const skill = skills.find((row) => row.id === skillId);
  if (!skill || skillId < 2 || skillId > 17 || state.player.level < skill.learnlevel) throw new RangeError("尚未达到技能解锁等级");
  const equipped = state.player.equippedSkillIds;
  const selected = equipped.includes(skillId);
  if (!selected && equipped.length >= 3) throw new RangeError("最多装备 3 个技能");
  return { ...state, player: { ...state.player, equippedSkillIds: selected ? equipped.filter((id) => id !== skillId) : [...equipped, skillId] } };
}

export function equipBagItem(state, index, catalog) {
  const item = state.inventory.equipment[index];
  if (!item || item.subtype < 1 || item.subtype === 10 || item.subtype > 14) throw new RangeError("请选择可穿戴的装备");
  if (state.player.level < item.level || item.subtype <= 9 && item.paragonGrowth && state.player.paragon < item.paragonGrowth) throw new RangeError("角色等级或巅峰等级不足");
  const setIndex = state.player.equipmentSetIndex;
  const equipment = state.player.equipmentSets[setIndex];
  const previous = equipment.find((old) => old.subtype === item.subtype);
  const next = equipment.filter((old) => old.subtype !== item.subtype);
  let incoming = item, outgoing = previous;
  if (previous && item.subtype <= 8 && previous.strength > item.strength) {
    incoming = withEquipmentStrength(item, previous.strength, catalog.items.find((row) => row.id === item.id));
    outgoing = withEquipmentStrength(previous, item.strength, catalog.items.find((row) => row.id === previous.id));
  }
  next.push({ ...incoming, equipped: true });
  const bag = state.inventory.equipment.filter((_, itemIndex) => itemIndex !== index);
  if (outgoing) bag.push({ ...outgoing, equipped: false });
  return { ...state, player: { ...state.player, equipmentSets: state.player.equipmentSets.map((set, i) => i === setIndex ? next : set) },
    inventory: { ...state.inventory, equipment: bag } };
}
