import { createNewGame } from "./new-game-domain.js";
import { advanceSoloBattle } from "./battle-domain.js";
import { calculatePlayerEffects, collectEquipmentAttributes, recalculatePlayerFromEquipment } from "./attribute-domain.js";
import { getCopyAccess, maximumCopyDifficulty, prepareCopyBattle } from "./copy-domain.js";
import { payCopyEntry, settleCopyVictory } from "./adventure-domain.js";
import { equipBagItem, toggleEquippedSkill } from "./loadout-domain.js";

export function createMonsterGameController({ catalog, store, view, random, wait }) {
  let state = null;
  let active = false;
  let revision = 0;
  let unsaved = false;
  let repeat = false;
  const settings = { type: 1, chapterId: null, hard: 1, waves: 1, repeat: false };
  async function save() {
    const request = revision;
    unsaved = true;
    view.saveStatus("正在保存到当前账号…");
    try { await store.save(state); if (request !== revision) return false; unsaved = false; view.saveStatus("已保存到当前账号的云存档"); return true; }
    catch (error) { if (request === revision) view.saveStatus(`云端保存失败：${error.message}`, true, error.status); return false; }
  }
  function home() { return view.home(state, catalog).catch((error) => view.notice(`界面加载失败：${error.message}`)); }
  function refresh() {
    const wing = state.inventory.wings.find((item) => item.id === state.player.wingId);
    const equipment = [...state.player.equipmentSets[state.player.equipmentSetIndex], ...(wing ? [wing] : [])];
    state = { ...state, player: { ...recalculatePlayerFromEquipment(state.player, equipment), ...calculatePlayerEffects(collectEquipmentAttributes(equipment)) } };
  }
  async function startCopy(copyId, selected) {
    if (!state || active) return;
    if (unsaved) { view.notice("请先重试保存当前进度，再继续战斗。"); return; }
    let copy = catalog.copies.find((item) => item.id === copyId);
    if (!copy) { view.notice("关卡不存在"); return; }
    const locked = getCopyAccess(copy, state, catalog.chapters);
    if (locked) { view.notice(locked); return; }
    Object.assign(settings, selected);
    settings.hard = Math.max(1, Math.min(maximumCopyDifficulty(state.player), Math.trunc(settings.hard)));
    settings.waves = Math.max(1, Math.min(10 + (state.player.extraWaves || 0), Math.trunc(settings.waves)));
    const serial = ++revision;
    active = true;
    repeat = settings.repeat;
    view.repeatStatus(repeat);
    try {
      do {
        refresh();
        const prepared = prepareCopyBattle({ copy, player: state.player,
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
        let reward = { gold: 0, experience: 0, honor: 0, items: [] };
        state = { ...state, player: { ...state.player, hp: battle.allies[0].hp, dead: battle.allies[0].dead } };
        if (battle.outcome === 3) {
          const settlement = settleCopyVictory({ state, copy, prepared, catalog, draw: random });
          state = settlement.state; reward = settlement.reward;
        } else repeat = false;
        refresh();
        if (!await save()) repeat = false;
        if (serial !== revision) return;
        await view.result(battle.outcome, reward, state, catalog);
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
    selectCopy(type) {
      if (!state || active) return;
      if ([1, 2, 3, 5, 6].includes(type)) settings.type = type;
      view.selectCopy(state, catalog, settings);
    },
    startCopy,
    stopRepeat() { repeat = false; view.repeatStatus(false); view.notice("已关闭连续战斗，本场结算后停止。"); },
    role() { if (state && !active) view.role(state, catalog); },
    skills() { if (state && !active) view.skills(state, catalog); },
    bag() { if (state && !active) view.bag(state, catalog); },
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
    destroy() { revision += 1; active = false; repeat = false; view.repeatStatus(false); },
  };
}
