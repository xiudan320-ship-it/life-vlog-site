// Product-specific +19..+30 progression. Swapping low-level gear cannot lower
// these costs: the extended tiers depend only on the enhancement level.
const extended = [
  [17, 70, 200], [16, 80, 240], [15, 90, 280], [14, 105, 330],
  [13, 120, 380], [12, 140, 440], [10, 160, 500], [9, 185, 570],
  [8, 210, 650], [6, 240, 740], [5, 275, 840], [4, 315, 950],
];

export function getExtendedStrengthRule(currentStrength, boost = false) {
  if (!Number.isInteger(currentStrength) || currentStrength < 18 || currentStrength > 29) throw new RangeError("请选择 +19 至 +30 的强化等级");
  const [threshold, stones, extra] = extended[currentStrength - 18];
  return { threshold: threshold + (boost ? 5 : 0), stones, extra: boost ? extra : 0 };
}
