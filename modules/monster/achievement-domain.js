// Native achievement rows supply thresholds, rewards and title attributes.
const supported = new Set([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 20, 21, 22, 27, 28, 30, 33, 35]);
const exchangeTitles = new Map([[144, 500], [145, 650], [158, 800], [171, 950]]);
const emptyProgress = () => ({ counters: {}, completed: [], points: 0, titleId: 0 });

export function achievementAvailable(row) { return supported.has(row.subtype); }
export function achievementProgress(state) { return state.achievementProgress || emptyProgress(); }

export function recordAchievements({ state, catalog, increments = {}, peaks = {} }) {
  if (!catalog.achievements) return state;
  const current = achievementProgress(state);
  const counters = { ...current.counters };
  for (const [type, amount] of Object.entries(increments)) {
    if (amount > 0) counters[type] = Math.min(Number.MAX_SAFE_INTEGER, (counters[type] || 0) + amount);
  }
  const observed = { 1: state.player.level, 7: state.gold };
  // Scan existing equipment/progress once; later upgrades and abyss wins report peaks.
  if (!state.achievementProgress) {
    const equipment = [...state.inventory.equipment, ...state.player.equipmentSets.flat()];
    observed[2] = Math.max(0, ...equipment.filter((item) => item.subtype <= 8).map((item) => item.strength || 0));
    observed[4] = Math.max(0, ...equipment.map((item) => item.enchantment?.level || 0));
    observed[14] = Math.max(0, ...state.progress.copies.filter((entry) => entry.id > 5000 && entry.id < 6000 && entry.value > 0).map((entry) => entry.id - 5000));
  }
  for (const [type, value] of [...Object.entries(observed), ...Object.entries(peaks)]) counters[type] = Math.max(counters[type] || 0, value);
  const completed = [...current.completed];
  const done = new Set(completed);
  let points = current.points, money = state.money;
  for (const row of catalog.achievements) {
    if (row.type !== 1 || !achievementAvailable(row) || done.has(row.id) || (counters[row.subtype] || 0) < row.needcount) continue;
    completed.push(row.id); done.add(row.id); points += row.awardspecial; money = (money + row.awardmoney) | 0;
  }
  return { ...state, money, achievementProgress: { ...current, counters, completed, points } };
}

export function recordBattleAchievements({ state, catalog, copy, prepared, defeated, victory }) {
  if (!catalog.achievements) return state;
  const increments = { 9: defeated };
  const chapter = copy.type === 1 && catalog.chapters.find((row) => copy.id >= row.minid && copy.id <= row.maxid || row.hideboss === copy.id);
  if (victory && chapter && (copy.id === chapter.maxid || copy.id === chapter.hideboss)) increments[10] = defeated;
  if (prepared.encounterCopy && defeated === prepared.enemyCount) increments[11] = 1;
  if (victory && copy.type === 2) increments[12] = 1;
  if (victory && copy.type === 5) increments[13] = 1;
  if (copy.type === 3) increments[27] = 1;
  return recordAchievements({ state, catalog, increments, peaks: victory && copy.type === 5 ? { 14: copy.id - 5000 } : {} });
}

export function titleStatus(row, state, catalog) {
  const progress = achievementProgress(state);
  if (progress.purchasedTitles?.includes(row.id)) return { unlocked: true, detail: "已通过积分商店解锁" };
  if (row.subtype === 51) {
    const possible = catalog.achievements.filter((entry) => entry.type === 1 && achievementAvailable(entry)).reduce((sum, entry) => sum + entry.awardspecial, 0);
    return { unlocked: progress.points >= row.needcount, detail: `成就积分 ${progress.points} / ${row.needcount}${row.needcount > possible ? "（需更多玩法接通）" : ""}` };
  }
  if (row.subtype === 52) {
    const requirements = [row.require1, row.require2, row.require3].filter(Boolean).map((id) => catalog.achievements.find((entry) => entry.id === id && entry.type === 1));
    const available = requirements.every((entry) => entry && achievementAvailable(entry));
    return { unlocked: available && requirements.every((entry) => progress.completed.includes(entry.id)),
      detail: requirements.map((entry) => entry?.name || "未知成就").join("、") + (available ? "" : "（部分玩法尚未接通）") };
  }
  const threshold = row.subtype === 55 ? row.needcount * 100 : exchangeTitles.get(row.id);
  if (threshold) return { unlocked: progress.points >= threshold, detail: `移植版：成就积分 ${progress.points} / ${threshold}` };
  return { unlocked: false, detail: "原版获取玩法尚未接通" };
}

export function equipTitle({ state, catalog, id }) {
  const row = catalog.achievements.find((entry) => entry.type === 2 && entry.id === id);
  if (!row || !titleStatus(row, state, catalog).unlocked) throw new RangeError("该称号尚未解锁");
  const progress = achievementProgress(state);
  return { ...state, achievementProgress: { ...progress, titleId: progress.titleId === id ? 0 : id } };
}

export function titleAttributes(state, catalog) {
  const row = catalog.achievements?.find((entry) => entry.type === 2 && entry.id === state.achievementProgress?.titleId);
  if (!row) return [];
  return [1, 2, 3].filter((index) => row[`atttype${index}`] > 0)
    .map((index) => ({ type: row[`atttype${index}`], value: row[`attvalue${index}`] }));
}
