import { createNewGame } from "./new-game-domain.js";
import { applyEnemyDifficulty, applyEnemyQuality, createEnemyFromCatalog, selectRegularEnemyQuality } from "./enemy-domain.js";
import { advanceSoloNormalBattle } from "./solo-battle-domain.js";
import { calculateRegularCopyRewards, getBattleQualityRewardRate } from "./reward-domain.js";
import { createMaterialDrops, prepareCopyDropGroups, selectCopyDropIds } from "./loot-domain.js";
import { creditBattleLoot } from "./settlement-domain.js";
import { recordRegularCopyVictory } from "./copy-progress-domain.js";
import { recalculatePlayerFromEquipment } from "./attribute-domain.js";

// First regular-copy preview controller. Unsupported paths stop explicitly;
// the original rare encounter is never silently replaced with a normal wolf.
export function createMonsterGameController({ catalog, store, view, random, wait }) {
  let state = null;
  let active = false;
  let revision = 0;
  function save() {
    try { store.save(state); view.saveStatus("已保存到本机"); return true; }
    catch { view.saveStatus("保存失败，请保持本页并点击重试保存", true); return false; }
  }
  function home() { return view.home(state, catalog).catch((error) => view.notice(`界面加载失败：${error.message}`)); }
  function refresh(player, inventory) {
    const wing = inventory.wings.find((item) => item.id === player.wingId);
    return recalculatePlayerFromEquipment(player, [
      ...player.equipmentSets[player.equipmentSetIndex], ...(wing ? [wing] : []),
    ]);
  }
  async function startFirstCopy() {
    if (!state || active) return;
    const copy = catalog.copies.find((item) => item.id === 1001);
    const groups = prepareCopyDropGroups({ copy, roll: random() });
    // Native default settings: hard=1, one wave; floor((1+.5)*3*(4/5+.8))=7.
    const encounterRoll = random();
    if (encounterRoll % 1001 < 7 && state.player.level - copy.level <= 10) {
      view.notice("本次触发了特殊遭遇，这条分支仍在迁移，尚未开始战斗或结算。");
      return;
    }
    if (state.player.paragon !== 1 || state.inventory.pets.length) {
      view.notice("巅峰和宠物战斗仍在迁移。当前版本开放单角色首关试玩。");
      return;
    }
    const quality = selectRegularEnemyQuality(random());
    const baseEnemy = createEnemyFromCatalog(catalog.enemies.find((item) => item.id === copy.enemyid1), catalog.skills);
    const enemy = applyEnemyDifficulty(applyEnemyQuality({ ...baseEnemy, quality }, quality), 1);
    let battle = {
      allies: [{ ...state.player, hp: state.player.maxHp, dead: false, acted: false, roleType: 1, buffs: [] }],
      enemies: [enemy], currentEnemyIndex: 0, phase: 1, wave: 1, outcome: 0, revives: 0,
    };
    const serial = ++revision;
    active = true;
    try {
      await view.battle(battle, state, catalog);
      while (serial === revision && battle.outcome !== 1 && battle.outcome !== 3) {
        await wait(550);
        if (serial !== revision) return;
        const action = advanceSoloNormalBattle(battle, random);
        battle = action.battle;
        view.battleUpdate(battle, action.hit, state, catalog);
      }
      if (serial !== revision) return;
      await wait(450);
      if (serial !== revision) return;
      let reward = { gold: 0, experience: 0, honor: 0, items: [] };
      state = { ...state, player: { ...state.player, hp: battle.allies[0].hp, dead: battle.allies[0].dead } };
      if (battle.outcome === 3) {
        reward = calculateRegularCopyRewards({
          copy: { ...copy, clearCount: state.progress.copies.find((entry) => entry.id === copy.id)?.value || 0 },
          player: { ...state.player, goldRate: 100, dropRate: 100, experienceRate: 100 },
          hard: 1, globalRate: getBattleQualityRewardRate([quality]), enemyCount: 1, rareRoll: random(),
        });
        // Exactly these six original first-copy groups; no equipment factory is substituted.
        const rolls = Array.from({ length: Object.values(groups).reduce((sum, ids) => sum + ids.length, 0) }, random);
        const selected = selectCopyDropIds({ groups, copyType: copy.type, hard: 1, activityEnabled: false, dropRate: reward.dropRate, rolls });
        reward.items = createMaterialDrops({ itemIds: selected.itemIds, items: catalog.items });
        state = creditBattleLoot(state, reward).state;
        const progress = recordRegularCopyVictory({
          progress: state.progress, money: state.money, copy,
          chapter: catalog.chapters.find((chapter) => chapter.id === 1), enemyCount: 1,
        });
        state = { ...state, progress: progress.progress, money: progress.money };
      }
      state = { ...state, player: refresh(state.player, state.inventory) };
      save();
      await view.result(battle.outcome, reward, state, catalog);
    } catch (error) {
      view.notice(`战斗暂时无法继续：${error.message}`);
      home();
    } finally { active = false; }
  }
  return {
    async initialize() {
      try { state = store.load(); }
      catch { view.loadError("本地存档读取失败。请保留现有数据，刷新重试。"); return; }
      await view.menu(Boolean(state));
    },
    create(name) {
      if (state || active) return;
      state = createNewGame({ items: catalog.items, skills: catalog.skills });
      state.player.name = name.trim();
      save();
      home();
    },
    continue() { if (state && !active) home(); },
    startFirstCopy,
    role() { if (state && !active) view.role(state, catalog); },
    bag() { if (state && !active) view.bag(state, catalog); },
    save() { if (state && !active) save(); },
    destroy() { revision += 1; active = false; },
  };
}
