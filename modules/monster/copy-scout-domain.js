import { getCopyAccess, maximumCopyDifficulty, prepareCopyBattle } from "./copy-domain.js";

const attributes = ["attack", "defense", "maxHp", "hit", "dodge", "crit", "critHurt", "resistance", "critResistance"];
const integer = (value, fallback) => Number.isFinite(value) ? Math.trunc(value) : fallback;
const bound = (value, min, max) => Math.max(min, Math.min(max, value));
const referencePower = (role) => Math.round(role.attack + role.defense + role.maxHp / 10);

/** Preview ordinary enemy bounds using deterministic preparation, never gameplay RNG. */
export function getCopyScout({ state, catalog, copy, settings = {} }) {
  const locked = getCopyAccess(copy, state, catalog.chapters)
    || (copy.type === 6 && state.trial?.status === "ended" ? "本轮试炼已结束，请先结算奖励" : null);
  if (copy.type === 4) return { locked, unavailable: "该敌人只会在地图中随机遭遇，无法单独挑战。" };
  const hard = bound(integer(settings.hard, 1), 1, maximumCopyDifficulty(state.player));
  const waves = bound(integer(settings.waves, 1), 1, 10 + (state.player.extraWaves || 0));
  const trial = state.trial && state.trial.status !== "claimed" ? state.trial : null;
  const trialLevel = trial?.level || 1;
  const trialHard = trial?.hard || bound(integer(settings.trialHard, 1), 1, 3);
  // Disable only map encounters in this preview; all ordinary preparation remains native.
  const player = { ...state.player, encounterBonus: -100,
    ...(copy.type === 6 ? { trialLevel, trialHard } : {}) };
  const clearCount = state.progress.copies.find((row) => row.id === copy.id)?.value || 0;
  const ids = [1, 2, 3, 4, 5].map((index) => copy[`enemyid${index}`]).filter(Boolean);
  const randomFormation = copy.type === 6 || (copy.type === 2 && copy.id > 2049 && copy.id <= 2055);
  const distinct = [...new Set(ids)];
  const prepare = (id, roll) => {
    let draws = 0;
    const draw = () => {
      const index = draws++;
      if ([1, 2].includes(copy.type) && index === 0) return 0; // drop group construction
      const enemyDraw = index - ([1, 2].includes(copy.type) ? 1 : 0);
      return randomFormation && enemyDraw % 2 === 0 ? ids.indexOf(id) : roll;
    };
    return prepareCopyBattle({ copy, player, clearCount, hard, waves, catalog, draw });
  };
  let prepared;
  const enemyGroups = distinct.map((id) => {
    const low = prepare(id, 0);
    const high = prepare(id, 100);
    prepared ||= low;
    const lo = low.battle.enemies.find((enemy) => enemy.id === id);
    const hi = high.battle.enemies.find((enemy) => enemy.id === id);
    const row = catalog.enemies.find((enemy) => enemy.id === id);
    const min = Object.fromEntries(attributes.map((key) => [key, Math.min(lo[key] || 0, hi[key] || 0)]));
    const max = Object.fromEntries(attributes.map((key) => [key, Math.max(lo[key] || 0, hi[key] || 0)]));
    return { id, name: row.name, image: row.img,
      count: randomFormation ? null : low.battle.enemies.filter((enemy) => enemy.id === id).length,
      min, max, skills: lo.skillIds.map((skillId) => ({ id: skillId, name: catalog.skills.find((skill) => skill.id === skillId)?.name || `技能 ${skillId}` })) };
  });
  if (!prepared || !enemyGroups.length) return { locked, unavailable: "该关卡没有可预览的敌人。" };
  const playerPower = referencePower(player);
  const maxEnemyPower = Math.max(...enemyGroups.map((group) => referencePower(group.max)));
  const recommendedPower = Math.ceil(maxEnemyPower * Math.sqrt(prepared.enemyCount));
  const ratio = recommendedPower > 0 ? playerPower / recommendedPower : Infinity;
  const risk = ratio >= 1.3 ? "comfortable" : ratio >= 0.8 ? "close" : "danger";
  const riskLabel = { comfortable: "参考值较充足", close: "参考值接近", danger: "参考值偏低" }[risk];
  const maxEnemyAttack = Math.max(...enemyGroups.map((group) => group.max.attack));
  const maxEnemyDefense = Math.max(...enemyGroups.map((group) => group.max.defense));
  const maxEnemyHp = Math.max(...enemyGroups.map((group) => group.max.maxHp));
  const reasons = [
    `角色参考战力 ${playerPower}，关卡参考值 ${recommendedPower}。`,
    `角色生命 ${player.maxHp}、攻击 ${player.attack}、防御 ${player.defense}；敌人最高生命 ${maxEnemyHp}、攻击 ${maxEnemyAttack}、防御 ${maxEnemyDefense}。`,
  ];
  const notes = ["仅预览常规敌人的品质范围，不包含地图随机遭遇。",
    "参考战力为攻击 + 防御 + 生命上限 ÷ 10；推荐值按最强敌人与敌人数量估算，仅供比较，不预测胜负。",
    "技能、命中、暴击、恢复及随机效果均会影响结果。"];
  if (copy.type === 1 && clearCount === 0) notes.push("首次通关固定普通难度、单波。");
  if (randomFormation) notes.push("敌人从所列类型中随机抽取，单种数量不固定。");
  if (copy.type === 6) notes.push(`按试炼第 ${trialLevel} 层、难度 ${trialHard} 预览。`);
  return { locked, hard: prepared.hard, waves: copy.type === 1 ? prepared.enemyCount / ids.length : null,
    enemyCount: prepared.enemyCount, trialLevel: copy.type === 6 ? trialLevel : null,
    trialHard: copy.type === 6 ? trialHard : null, playerPower, recommendedPower,
    comparison: playerPower >= recommendedPower ? "达到参考值" : "未达到参考值",
    risk, riskLabel, reasons, enemyGroups, notes };
}
