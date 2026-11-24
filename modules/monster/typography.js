export const MONSTER_FONT = "Arial";

/** Apply the same font to original Cocos labels and button titles. */
export function unifyCanvasTypography(root, cc, ccui) {
  function visit(node) {
    if (node instanceof ccui.Text || cc.LabelTTF && node instanceof cc.LabelTTF) node.setFontName(MONSTER_FONT);
    if (node instanceof ccui.Button) node.setTitleFontName(MONSTER_FONT);
    for (const child of node.getChildren?.() || []) visit(child);
  }
  visit(root);
}
