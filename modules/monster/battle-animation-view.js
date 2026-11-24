// The APK moves the attacker forward and back, then plays the skill's
// attackedani atlas over its target. Combat resolution remains independent.
export function createBattleAnimations({ cc, assets, reducedMotion }) {
  const sheets = new Map();
  const loading = new Map();

  async function prepare(battle, skills) {
    const ids = new Set([1, ...battle.allies.flatMap((role) => role.equippedSkillIds),
      ...battle.enemies.flatMap((role) => role.equippedSkillIds)]);
    const names = [...new Set([...ids].map((id) => {
      const skill = skills.find((entry) => entry.id === id);
      if (!skill) throw new RangeError(`Missing animation skill ${id}.`);
      return skill.attackedani;
    }))].filter((name) => !sheets.has(name));
    await Promise.all(names.map((name) => {
      if (loading.has(name)) return loading.get(name);
      const plist = `${assets}ani/${name}.plist`;
      const image = `${assets}ani/${name}.png`;
      const request = new Promise((resolve, reject) => cc.loader.load([plist, image], (error) => error ? reject(new Error(String(error))) : resolve()))
        .then(() => {
          const keys = Object.keys(cc.loader.getRes(plist).frames).sort((left, right) =>
            Number(left.match(/_(\d+)\.png$/)[1]) - Number(right.match(/_(\d+)\.png$/)[1]));
          cc.spriteFrameCache.addSpriteFrames(plist, image);
          sheets.set(name, keys.map((key) => cc.spriteFrameCache.getSpriteFrame(key)));
        }).finally(() => loading.delete(name));
      loading.set(name, request);
      return request;
    }));
  }

  function hit(hit, skill, actor, target, first) {
    if (reducedMotion()) return;
    if (first) {
      const direction = hit.actor.side === "allies" ? 1 : -1;
      actor.runAction(cc.sequence(cc.moveBy(0.12, cc.p(0, direction * 20)), cc.moveBy(0.12, cc.p(0, -direction * 20))));
    }
    const frames = sheets.get(skill.attackedani);
    const effect = new cc.Sprite(frames[0]);
    effect.setName("monster-skill-effect");
    target.addChild(effect, 40);
    effect.runAction(cc.sequence(cc.animate(new cc.Animation(frames, 0.1)), cc.removeSelf()));
  }

  return { prepare, hit };
}
