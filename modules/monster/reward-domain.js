// WarFinishLayer::initUi (0x9ef4f0..0x9f035c), numeric regular-copy branch.
// Item creation, special encounters, task/progress updates and saving are separate.
const float = Math.fround;

/** WarLayer::initWarData (0x9ff64c), integer average of enemy quality factors. */
export function getBattleQualityRewardRate(qualities) {
  if (!qualities.length) throw new RangeError("Reward quality requires at least one enemy.");
  const total = qualities.reduce((sum, quality) => (sum + ([100, 100, 120, 150, 200][quality] ?? 100)) | 0, 0);
  return Math.trunc(total / qualities.length);
}

export function calculateRegularCopyRewards({
  copy, player, hard, globalRate, enemyCount, rareRoll, paragonOffset = null,
}) {
  if (!Number.isInteger(rareRoll) || rareRoll < 0 || rareRoll > 0x7fffffff) {
    throw new RangeError("Regular-copy rewards require an original 31-bit random draw.");
  }
  const difference = (player.level - copy.level) | 0;
  const levelFactor = float(difference < 5 ? 1 : difference < 10 ? 0.7
    : difference < 20 ? 0.5 : difference < 30 ? 0.3 : difference < 40 ? 0.2 : 0.15);
  const rate = globalRate <= 0 ? 100 : globalRate;
  let dropRate = float(float(float(float(player.dropRate) / float(100)) * float(rate)) * levelFactor);
  const rewardRate = float(float(rate) * levelFactor);
  const bonusDrop = copy.clearCount === 0 || float(float(rareRoll) / float(0x80000000)) < float(0.001);
  if (bonusDrop) dropRate = float(dropRate + float(50));
  let difficultyFactor = float([1, 0.65, 0.9, 1.1, 1.2, 1.3, 1.4][hard] ?? 1);
  if (player.paragon > 100 && hard <= 2) difficultyFactor = float(difficultyFactor * float(0.9));
  if (player.paragon > 300 && hard <= 3) difficultyFactor = float(difficultyFactor * float(0.8));
  if (player.paragon > 500 && hard <= 4) difficultyFactor = float(difficultyFactor * float(0.7));
  const adjusted = float(rewardRate * difficultyFactor);
  dropRate = float(dropRate * difficultyFactor);
  let gold = float(float(copy.gold) * adjusted);
  gold = float(gold / float(100));
  gold = float(gold * float(enemyCount));
  gold = float(gold * float(player.goldRate));
  gold = Math.trunc(float(gold / float(100)));
  let experience = float(float(copy.exp) * adjusted);
  experience = float(experience / float(100));
  experience = float(experience * float(enemyCount));
  experience = Math.trunc(float(experience * float(float(player.experienceRate) / float(100))));
  const honor = Math.trunc(float(float(float(float(copy.honor) * dropRate) / float(100)) * float(enemyCount)));
  if (paragonOffset !== null) {
    gold = Math.trunc(float(float(gold) * float(paragonOffset)));
    experience = Math.trunc(float(float(experience) * float(paragonOffset)));
  }
  return { gold, experience, honor, dropRate, levelFactor, difficultyFactor, bonusDrop };
}
