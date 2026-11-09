import { createNewGame } from "./new-game-domain.js";
import { advanceSoloBattle } from "./battle-domain.js";
import { calculatePlayerEffects, collectEquipmentAttributes, calculatePlayerCoreAttributes, sumAttributes } from "./attribute-domain.js";
import { getCopyAccess, maximumCopyDifficulty, prepareCopyBattle } from "./copy-domain.js";
import { payCopyEntry, settleCopyVictory, settleCopyDefeat } from "./adventure-domain.js";
import { equipBagItem, toggleEquippedSkill } from "./loadout-domain.js";
import { beginTrial, advanceTrial, claimTrialRewards } from "./trial-domain.js";
import { createTaskBoard, recordTaskBattle, claimTask, claimDailyReward, gameDay } from "./task-domain.js";
import { upgradeEquipment, getOwnedEquipment } from "./upgrade-domain.js";
import { craftItem } from "./craft-domain.js";
import { smeltItems } from "./smelt-domain.js";
import { upgradeSpecial, calculateSpecialAttributes } from "./special-upgrade-domain.js";
import { upgradeGod } from "./god-upgrade-domain.js";
import { sellBagItem, toggleBagEquipmentLock } from "./bag-item-domain.js";
import { assignMainPet, collectMainPetAttributes } from "./pet-domain.js";
import { findMaterialSources } from "./material-source-domain.js";

export function createMonsterGameController({ catalog, store, view, random, wait, now = Date.now }) {
  let state = null;
  let active = false;
  let revision = 0;
  let unsaved = false;
  let saveErrorStatus = null;
  let repeat = false;
  let strengthening = false;
  const settings = { type: 1, chapterId: null, hard: 1, waves: 1, repeat: false };
  async function save() {
    const request = revision;
    unsaved = true;
    saveErrorStatus = null;
    view.saveStatus("正在保存到当前账号…");
    try { await store.save(state); if (request !== revision) return false; unsaved = false; view.saveStatus("已保存到当前账号的云存档"); return true; }
    catch (error) { if (request === revision) { saveErrorStatus = error.status || null; view.saveStatus(`云端保存失败：${error.message}`, true, error.status); } return false; }
  }
  function home() { return view.home(state, catalog).catch((error) => view.notice(`界面加载失败：${error.message}`)); }
  function refresh() {
    const special = (item) => item.subtype === 9 ? { ...item, attributes: calculateSpecialAttributes({ item, player: state.player, catalog }) } : item;
    state = { ...state, player: { ...state.player, equipmentSets: state.player.equipmentSets.map((set) => set.map(special)) },
      inventory: { ...state.inventory, equipment: state.inventory.equipment.map(special) } };
    const wing = state.inventory.wings.find((item) => item.id === state.player.wingId);
    const equipment = [...state.player.equipmentSets[state.player.equipmentSetIndex], ...(wing ? [wing] : [])];
    const attributes = sumAttributes([...collectEquipmentAttributes(equipment), ...collectMainPetAttributes({ state, catalog })]);
    state = { ...state, player: { ...state.player, ...calculatePlayerCoreAttributes({ level: state.player.level, paragon: state.player.paragon, attributes }), ...calculatePlayerEffects(attributes) } };
  }
  async function upgradeStep(target, operation, boost) {
    const result = upgradeEquipment({ state, target, operation, boost, catalog, draw: random });
    state = result.state; refresh();
    return { ...result, saved: await save() };
  }
  async function startCopy(copyId, selected) {
    if (!state || active) return;
    if (unsaved) { view.notice("请先重试保存当前进度，再继续战斗。"); return; }
    let copy = catalog.copies.find((item) => item.id === copyId);
    if (!copy) { view.notice("关卡不存在"); return; }
    const locked = getCopyAccess(copy, state, catalog.chapters);
    if (locked) { view.notice(locked); return; }
    if (copy.type === 6 && state.trial?.status === "ended") { view.notice("本轮试炼已结束，请先结算奖励。"); return; }
    Object.assign(settings, selected);
    settings.type = copy.type === 4 ? 3 : copy.type;
    settings.hard = Math.max(1, Math.min(maximumCopyDifficulty(state.player), Math.trunc(settings.hard)));
    settings.waves = Math.max(1, Math.min(10 + (state.player.extraWaves || 0), Math.trunc(settings.waves)));
    const serial = ++revision;
    active = true;
    repeat = copy.type !== 6 && settings.repeat;
    view.repeatStatus(repeat);
    try {
      if (copy.type === 6 && (!state.trial || state.trial.status === "claimed")) {
        state = beginTrial(state, selected?.trialHard || 1);
        if (!await save() || serial !== revision) return;
      }
      do {
        refresh();
        const player = copy.type === 6 ? { ...state.player, trialLevel: state.trial.level, trialHard: state.trial.hard } : state.player;
        const prepared = prepareCopyBattle({ copy, player,
          clearCount: state.progress.copies.find((entry) => entry.id === copy.id)?.value || 0,
          hard: settings.hard, waves: settings.waves, catalog, draw: random });
        let battle = { ...prepared.battle, bonuses: state.player.bonuses };
        await view.battle(battle, state, catalog);
        if (serial !== revision) return;
        const paid = payCopyEntry(state, copy);
        if (paid !== state) {
          state = paid;
          if (!await save() || serial !== revision) return;
        }
        while (serial === revision && ![1, 3].includes(battle.outcome)) {
          await wait(550);
          if (serial !== revision) return;
          const action = advanceSoloBattle(battle, { draw: random, skills: catalog.skills });
          battle = action.battle;
          view.battleUpdate(battle, null, state, catalog);
          for (const hit of action.hits) view.battleUpdate(battle, hit, state, catalog);
        }
        await wait(450);
        if (serial !== revision) return;
        state = { ...state, player: { ...state.player, hp: battle.allies[0].hp, dead: battle.allies[0].dead } };
        state = recordTaskBattle({ state, copy, prepared, battle });
        const settlement = battle.outcome === 3
          ? settleCopyVictory({ state, copy, prepared, catalog, draw: random })
          : settleCopyDefeat({ state, copy, prepared, battle, catalog, draw: random });
        state = settlement.state;
        if (copy.type === 6) state = { ...state, trial: battle.outcome === 3
          ? advanceTrial({ trial: state.trial, scoreBonus: state.player.trialScoreBonus, draw: random })
          : { ...state.trial, status: "ended" } };
        const reward = settlement.reward;
        if (battle.outcome !== 3) repeat = false;
        refresh();
        if (!await save()) repeat = false;
        if (serial !== revision) return;
        await view.result(battle.outcome, reward, state, catalog);
        if (copy.type === 6) view.trial(state, catalog);
        if (repeat) {
          if (copy.type === 5) {
            const next = catalog.copies.find((item) => item.id === copy.id + 1 && item.type === 5);
            if (next) copy = next;
            else repeat = false;
          }
          if (repeat) await wait(1800);
        }
      } while (repeat && serial === revision);
    } catch (error) {
      repeat = false;
      if (serial === revision) { await home(); view.notice(`战斗未能继续：${error.message}`); }
    } finally { if (serial === revision) { active = false; view.repeatStatus(false); } }
  }
  return {
    async initialize() {
      const request = ++revision;
      try { const loaded = await store.load(); if (request !== revision) return; state = loaded; unsaved = false; if (state) refresh(); }
      catch (error) { if (request === revision) view.loadError(`云存档读取失败：${error.message}`); return; }
      await view.menu(Boolean(state));
    },
    async create(name) {
      if (state || active) return;
      const request = revision;
      state = createNewGame({ items: catalog.items, skills: catalog.skills });
      state.player.name = name.trim(); refresh();
      active = true;
      await save(); if (request !== revision) return; active = false;
      await home();
    },
    continue() { if (state && !active) void home(); },
    async returnToSelection() {
      if (!state || active) return;
      const serial = revision;
      await home();
      if (serial === revision) view.selectCopy(state, catalog, settings);
    },
    selectCopy(type) {
      if (!state || active) return;
      if ([1, 2, 3, 5, 6].includes(type)) settings.type = type;
      view.selectCopy(state, catalog, settings);
    },
    materialSources(itemId) {
      if (state && !active) view.materialSources(state, catalog, itemId, findMaterialSources({ state, catalog, itemId }));
    },
    closeMaterialSources() { view.closeMaterialSources(); },
    goToCopy(copyId, source = {}) {
      if (!state || active) return;
      const copy = catalog.copies.find((entry) => entry.id === copyId);
      if (!copy || ![1, 2, 3, 5, 6].includes(copy.type)) return;
      const reason = getCopyAccess(copy, state, catalog.chapters);
      if (reason) { view.notice(reason); return; }
      const hard = [1, 2, 3, 4, 5, 6].includes(source.hard) ? source.hard : 1;
      if (hard > maximumCopyDifficulty(state.player)) { view.notice("当前角色尚未解锁此难度"); return; }
      Object.assign(settings, { type: copy.type, focusCopyId: copyId, scrollTop: 0, repeat: false, hard, trialHard: [1, 2, 3].includes(source.trialHard) ? source.trialHard : 1 });
      const chapter = catalog.chapters.find((entry) => copy.id >= entry.minid && copy.id <= entry.maxid || copy.id === entry.hideboss);
      if (chapter) settings.chapterId = chapter.id;
      view.selectCopy(state, catalog, settings);
    },
    startCopy,
    workshop() { if (state && !active) view.workshop(state, catalog); },
    godUpgrade(target) { if (state && !active) view.godUpgrade(state, catalog, target); },
    async performGodUpgrade(target, operation) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try { state = upgradeGod({ state, target, operation, catalog, draw: random }).state; refresh(); await save(); if (serial === revision) view.godUpgrade(state, catalog, target, operation === "upgrade" ? "神器升星完成" : "最后一星属性已更新"); }
      catch (error) { if (serial === revision) { view.godUpgrade(state, catalog, target); view.notice(error.message); } }
      finally { if (serial === revision) active = false; }
    },
    showCraft() { if (state && !active) view.craft(state, catalog); },
    showSmelt() { if (state && !active) view.smelt(state, catalog); },
    async craft(itemId) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try {
        state = craftItem({ state, itemId, catalog, draw: random }).state;
        const saved = await save();
        if (serial === revision) {
          view.updateHome(state, catalog);
          view.craft(state, catalog, saved ? "打造完成，物品已入背包并保存" : "打造已完成，云端未保存，请先重试保存", true);
        }
      }
      catch (error) { if (serial === revision) { view.craft(state, catalog, undefined, true); view.notice(error.message); } }
      finally { if (serial === revision) active = false; }
    },
    async smelt(mode, selection) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try { const result = smeltItems({ state, mode, selection, catalog, draw: random }); state = result.state; await save(); if (serial === revision) view.smelt(state, catalog, result); }
      catch (error) { if (serial === revision) { view.smelt(state, catalog); view.notice(error.message); } }
      finally { if (serial === revision) active = false; }
    },
    upgrade(target) {
      if (!state || active) return;
      const item = (target.source === "bag" ? state.inventory.equipment : state.player.equipmentSets[state.player.equipmentSetIndex])[target.index];
      if (item?.subtype === 9) view.specialUpgrade(state, catalog, target);
      else view.upgrade(state, catalog, target);
    },
    async performSpecialUpgrade(target) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try { state = upgradeSpecial({ state, target, catalog }).state; refresh(); await save(); if (serial === revision) view.specialUpgrade(state, catalog, target, "徽章升级完成"); }
      catch (error) { if (serial === revision) { view.specialUpgrade(state, catalog, target); view.notice(error.message); } }
      finally { if (serial === revision) active = false; }
    },
    async performUpgrade(target, operation, boost) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try {
        const result = await upgradeStep(target, operation, boost);
        if (serial === revision) {
          view.updateHome(state, catalog);
          view.updateUpgrade(state, catalog, target, { message: operation === "strength" ? result.success ? `强化成功 +${result.item.strength}` : `强化失败，保留 +${result.item.strength}` : "操作完成，装备属性已更新", saved: result.saved, status: saveErrorStatus }, { running: false, attempts: 0 });
        }
      } catch (error) { if (serial === revision) view.notice(error.message); }
      finally { if (serial === revision) active = false; }
    },
    async strengthenUntil(target, targetLevel, boost) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      let level;
      try {
        level = getOwnedEquipment(state, target).strength;
        if (!Number.isSafeInteger(targetLevel) || targetLevel <= level || targetLevel > 18) throw new RangeError("请选择高于当前等级且不超过 +18 的目标");
      } catch (error) { view.notice(error.message); return; }
      const serial = revision; active = true; strengthening = true;
      let attempts = 0, receipt = null;
      const update = (running) => view.updateUpgrade(state, catalog, target, receipt, { running, attempts, targetLevel });
      try {
        update(true);
        while (strengthening && serial === revision && level < targetLevel) {
          const result = await upgradeStep(target, "strength", boost);
          if (serial !== revision) return;
          attempts++; level = result.item.strength;
          receipt = { message: result.success ? `强化成功 +${level}` : `强化失败，保留 +${level}`, saved: result.saved, status: saveErrorStatus };
          view.updateHome(state, catalog); update(true);
          if (!result.saved || !strengthening) break;
          if (level < targetLevel) await wait(100);
        }
        if (receipt?.saved) receipt = { ...receipt, message: level >= targetLevel ? `已强化到 +${level} · 尝试 ${attempts} 次` : `已停止连续强化 · 当前 +${level}` };
      } catch (error) {
        if (serial === revision) receipt = { message: `连续强化停止：${error.message}`, saved: !unsaved, status: saveErrorStatus };
      } finally {
        if (serial === revision) { strengthening = false; active = false; update(false); }
      }
    },
    stopStrengthening() { strengthening = false; },
    async tasks() {
      if (!state || active) return;
      if (!state.taskBoard) {
        if (unsaved) { view.notice("请先重试保存当前进度。"); return; }
        const serial = revision; active = true;
        try { state = createTaskBoard({ state, catalog, draw: random }); await save(); }
        finally { if (serial === revision) active = false; }
        if (serial !== revision) return;
      }
      view.tasks(state, catalog, now());
    },
    async claimTask(id) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try { state = claimTask({ state, id, catalog }); refresh(); await save(); if (serial === revision) view.tasks(state, catalog, now()); }
      catch (error) { view.notice(error.message); }
      finally { if (serial === revision) active = false; }
    },
    async claimDailyReward() {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try { state = claimDailyReward({ state, catalog, draw: random, day: gameDay(now()) }); await save(); if (serial === revision) view.tasks(state, catalog, now()); }
      catch (error) { view.notice(error.message); }
      finally { if (serial === revision) active = false; }
    },
    async claimTrial() {
      if (!state || active || unsaved) return;
      const serial = revision;
      active = true;
      try {
        state = claimTrialRewards({ state, catalog, draw: random });
        await save();
        if (serial === revision) view.trial(state, catalog);
      } catch (error) { view.notice(error.message); }
      finally { if (serial === revision) active = false; }
    },
    stopRepeat() { repeat = false; view.repeatStatus(false); view.notice("已关闭连续战斗，本场结算后停止。"); },
    role() { if (state && !active) view.role(state, catalog); },
    skills() { if (state && !active) view.skills(state, catalog); },
    bag(kind) { if (state && !active) view.bag(state, catalog, kind); },
    bagItem(target) { if (state && !active) view.bagItem(state, catalog, target); },
    pets() {
      if (!state || active) return;
      if (state.player.level < 35) { view.notice("宠物在 35 级开放"); return; }
      view.pets(state, catalog);
    },
    async setMainPet(target, enabled) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try {
        state = assignMainPet({ state, catalog, target, enabled }); refresh();
        const saved = await save();
        if (serial === revision) { view.updateHome(state, catalog); view.pets(state, catalog, { message: enabled ? "主宠已更新，角色属性已重算" : "主宠已卸下，角色属性已重算", saved, status: saveErrorStatus }); }
      } catch (error) { if (serial === revision) view.notice(error.message); }
      finally { if (serial === revision) active = false; }
    },
    async sellItem(target, quantity) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try {
        const result = sellBagItem({ state, target, quantity, catalog }); state = result.state;
        const saved = await save();
        if (serial === revision) { view.updateHome(state, catalog); view.bag(state, catalog, target.kind, { message: target.kind === "equipment" ? "分解完成" : "出售完成", reward: result.reward, saved, status: saveErrorStatus }); }
      } catch (error) { if (serial === revision) view.notice(error.message); }
      finally { if (serial === revision) active = false; }
    },
    async toggleItemLock(target) {
      if (!state || active || unsaved) { if (unsaved) view.notice("请先重试保存当前进度。"); return; }
      const serial = revision; active = true;
      try {
        state = toggleBagEquipmentLock({ state, target, catalog });
        const saved = await save();
        if (serial === revision) view.bagItem(state, catalog, target, { message: state.inventory.equipment[target.index].locked ? "装备已锁定" : "装备已解锁", saved, status: saveErrorStatus });
      } catch (error) { if (serial === revision) view.notice(error.message); }
      finally { if (serial === revision) active = false; }
    },
    async toggleSkill(id) {
      if (!state || active || unsaved) return false;
      const request = revision;
      try {
        state = toggleEquippedSkill(state, id, catalog.skills); active = true;
        await save(); return true;
      } catch (error) { view.notice(error.message); return false; }
      finally { if (request === revision) active = false; }
    },
    async equip(index) {
      if (!state || active || unsaved) return;
      const request = revision;
      try { state = equipBagItem(state, index); refresh(); active = true; await save(); if (request === revision) view.bag(state, catalog); }
      catch (error) { view.notice(error.message); }
      finally { if (request === revision) active = false; }
    },
    save() { if (state && !active) return save(); },
    getSaveErrorStatus() { return saveErrorStatus; },
    destroy() { revision += 1; active = false; repeat = false; strengthening = false; view.repeatStatus(false); },
  };
}
