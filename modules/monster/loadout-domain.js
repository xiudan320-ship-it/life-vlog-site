export function toggleEquippedSkill(state, skillId, skills) {
  const skill = skills.find((row) => row.id === skillId);
  if (!skill || skillId < 2 || skillId > 17 || state.player.level < skill.learnlevel) throw new RangeError("尚未达到技能解锁等级");
  const equipped = state.player.equippedSkillIds;
  const selected = equipped.includes(skillId);
  if (!selected && equipped.length >= 3) throw new RangeError("最多装备 3 个技能");
  return { ...state, player: { ...state.player, equippedSkillIds: selected ? equipped.filter((id) => id !== skillId) : [...equipped, skillId] } };
}

export function equipBagItem(state, index) {
  const item = state.inventory.equipment[index];
  if (!item || item.subtype < 1 || item.subtype > 9) throw new RangeError("请选择可穿戴的装备");
  if (state.player.level < item.level || item.paragonGrowth && state.player.paragon < item.paragonGrowth) throw new RangeError("角色等级或巅峰等级不足");
  const setIndex = state.player.equipmentSetIndex;
  const equipment = state.player.equipmentSets[setIndex];
  const previous = equipment.find((old) => old.subtype === item.subtype);
  const next = equipment.filter((old) => old.subtype !== item.subtype);
  next.push({ ...item, equipped: true });
  const bag = state.inventory.equipment.filter((_, itemIndex) => itemIndex !== index);
  if (previous) bag.push({ ...previous, equipped: false });
  return { ...state, player: { ...state.player, equipmentSets: state.player.equipmentSets.map((set, i) => i === setIndex ? next : set) },
    inventory: { ...state.inventory, equipment: bag } };
}
