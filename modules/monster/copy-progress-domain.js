// GameLogic::addCopyFinish (0x8503d4). Unlike bag stacking, only the first
// matching entry is updated when duplicate progress keys exist.
export function incrementCopyClear({ copies, copyId, amount }) {
  const index = copies.findIndex((entry) => entry.id === copyId);
  if (index < 0) {
    const value = amount | 0;
    return { copies: [...copies, { id: copyId, value }], value };
  }
  const value = (copies[index].value + amount) | 0;
  return { copies: copies.map((entry, i) => i === index ? { ...entry, value } : entry), value };
}

/** WarFinishLayer regular victory progress (0x9f28bc..0x9f2f74, 0x9f3058). */
export function recordRegularCopyVictory({ progress, money, copy, chapter, enemyCount }) {
  const clearCount = progress.copies.find((entry) => entry.id === copy.id)?.value || 0;
  const next = { ...progress };
  const count = (chapter.maxid - chapter.minid + 1) | 0;
  if (clearCount === 0 && next.levelId < count) next.levelId = (next.levelId + 1) | 0;
  const achievements = [];
  if (copy.id === chapter.hideboss) achievements.push([10, enemyCount]);
  if (copy.id === chapter.maxid) {
    achievements.push([10, enemyCount]);
    if (chapter.id <= 20 && chapter.id === next.chapterId && next.chapterId <= 20) {
      next.chapterId = (next.chapterId + 1) | 0;
      next.levelId = 1;
      next.newChapter = true;
      // GameLogic::changeMoney has a signed addition, without changeGold's cap.
      money = (money + 10) | 0;
    } else if (chapter.id === 21 && !next.finished) {
      next.finished = true;
    }
  }
  next.copies = incrementCopyClear({ copies: next.copies, copyId: copy.id, amount: 1 }).copies;
  return { progress: next, money, achievements };
}
