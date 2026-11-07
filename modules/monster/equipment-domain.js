// GameEquipment::refreshRealAtt (0x825ff0), regular equipment main-stat branch.
// Special gems, wings, enchantment and random-attribute generation are separate.
const float = Math.fround;
const scoreFactors = Object.freeze([0.7, 0.8, 0.9, 1].map(float));
const strengthFactors = Object.freeze([
  1, 1.08, 1.16, 1.25, 1.34, 1.44, 1.54, 1.65, 1.8, 2.05,
  2.4, 2.7, 3, 3.4, 3.8, 4.25, 4.65, 5.05, 5.45,
].map(float));

/** Calculate only a regular equipment item's main attribute. */
export function calculateEquipmentMainAttribute({
  scoreTier,
  scoreValue,
  mainValue,
  strength,
  paragonEquipment = false,
  godOffset = 0,
  paragonGrowth = 0,
}) {
  if (!Number.isInteger(strength) || strength < 0 || strength >= strengthFactors.length) {
    throw new RangeError("Equipment strength is outside the original main-stat table.");
  }
  const tier = scoreTier >= 1 && scoreTier <= 4 ? scoreTier : 1;
  const scorePart = float(float(float(scoreValue) / float(100))
    * float(tier === 4 ? 0.15 : 0.1));
  const scoreFactor = float(scoreFactors[tier - 1] + scorePart);
  let result = float(float((mainValue + godOffset) | 0) * strengthFactors[strength]);
  result = float(result * scoreFactor);
  if (paragonEquipment) {
    let growth = float(float(paragonGrowth) / float(300));
    if (growth > float(3) || growth <= float(0)) growth = 0;
    result = float(result * float(growth + float(1)));
  }
  return Math.trunc(result);
}
