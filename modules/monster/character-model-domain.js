// Two character images are present in the supplied 7.1 package. The additional
// model bonus is port balance; the original package has no model-bonus table.
export const characterModels = Object.freeze([
  Object.freeze({ image: "ani/2001.png", name: "勇者", attributes: [] }),
  Object.freeze({ image: "ani/2002.png", name: "暗影", attributes: [{ type: 9, value: 5 }] }),
]);

export function getCharacterModel(image) {
  const model = characterModels.find((entry) => entry.image === image);
  if (!model) throw new RangeError("角色形象数据无效");
  return model;
}

export function changeCharacterModel(state, image) {
  getCharacterModel(image);
  return { ...state, player: { ...state.player, image } };
}
