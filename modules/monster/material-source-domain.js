import { getCopyAccess, maximumCopyDifficulty } from "./copy-domain.js";
import { selectMapEncounter } from "./encounter-domain.js";

const ordinaryGroups = ["percent300", "percent100", "percent10", "percent2", "percent1"];
const ids = (value) => typeof value === "string" ? JSON.parse(value) || [] : value || [];

function dropAvailability(copy, itemId) {
  const groups = copy.dropGroups || copy;
  const ordinary = ordinaryGroups.some((key) =>
    // The current settlement always passes activityEnabled: false.
    !(itemId === 5100 && ["percent300", "percent100", "percent10"].includes(key))
    && ids(groups[key]).includes(itemId));
  const generated = itemId === 5003 && [1, 2].includes(copy.type);
  return { ordinary: ordinary || generated, paragon: ids(groups.paragondrop10).includes(itemId) };
}

/** Discover selectable locations supported by the current settlement rules. */
export function findMaterialSources({ state, catalog, itemId }) {
  const item = catalog.items.find((row) => row.id === itemId);
  if (!item || ![1, 2].includes(item.type)) return [];
  const maxHard = maximumCopyDifficulty(state.player);
  const sources = [];
  function add(copy, kind, detail, paragon = false) {
    const reason = getCopyAccess(copy, state, catalog.chapters)
      || (paragon && maxHard < 4 ? "需要等级 80 且巅峰 100" : "");
    const chapter = copy.type === 1 && catalog.chapters.find((row) =>
      copy.id >= row.minid && copy.id <= row.maxid || row.hideboss === copy.id);
    sources.push({ copyId: copy.id, type: copy.type, name: copy.name, level: copy.level,
      chapterId: chapter?.id || null, locked: reason || null, kind, detail, ...(paragon ? { hard: 4 } : {}) });
  }

  const encounters = catalog.copies.filter((copy) => copy.type === 4);
  for (const copy of catalog.copies) {
    if (![1, 2, 3, 5, 6].includes(copy.type)) continue;
    const availability = dropAvailability(copy, itemId);
    if (availability.ordinary) add(copy, "drop", "概率掉落");
    else if (availability.paragon) add(copy, "drop", "巅峰难度概率掉落", true);

    if (copy.type === 5) {
      const floor = copy.id - 5000;
      if ((item.type === 1 && ids(copy.specialdrop).includes(itemId))
        || (itemId === 5086 && floor > 0 && floor % 3 === 0)) {
        add(copy, "milestone", "通关固定奖励");
      }
    }

    if (copy.type === 1 && state.player.level - copy.level <= 10) {
      // Enumerate the exact categories used by selectMapEncounter at each difficulty.
      const candidates = [1, 4].flatMap((hard) => Array.from({ length: hard > 3 ? 6 : 4 }, (_, index) => {
        const encounter = selectMapEncounter({ level: copy.level, hard, copies: encounters, draw: () => index });
        if (!encounter) return null;
        const available = dropAvailability(encounter, itemId);
        if (!available.ordinary && !(hard > 3 && available.paragon)) return null;
        return { encounter, paragon: hard > 3 };
      }).filter(Boolean));
      const candidate = candidates.find((entry) => !entry.paragon) || candidates[0];
      if (candidate) add(copy, "encounter", `${candidate.paragon ? "巅峰难度" : ""}随机遭遇${candidate.encounter.name}后概率掉落`, candidate.paragon);
    }
  }

  const trialCopy = catalog.copies.find((copy) => copy.type === 6);
  if (trialCopy) {
    const rows = (catalog.trials || []).filter((row) => row.itemtype === item.type && row.itemnum > 0
      && row.itemweight > 0 && (row.itemid ? row.itemid === itemId : ids(row.items).includes(itemId)));
    if (rows.length) {
      rows.sort((a, b) => a.hard - b.hard || a.score - b.score);
      const row = rows[0];
      const threshold = Math.trunc(Math.fround(Math.fround(row.itemweight) * Math.fround(1 + Math.fround((row.hard - 1) * 0.2))));
      const randomChoice = !row.itemid && ids(row.items).length > 1;
      add(trialCopy, "trial", `试炼难度 ${row.hard}、积分 ${row.score} 起${threshold >= 100 && !randomChoice ? "固定" : "概率"}获得`);
      sources.at(-1).trialHard = row.hard;
    }
  }
  return sources.sort((a, b) => Number(Boolean(a.locked)) - Number(Boolean(b.locked))
    || Math.abs(a.level - state.player.level) - Math.abs(b.level - state.player.level)
    || a.copyId - b.copyId || a.kind.localeCompare(b.kind));
}
