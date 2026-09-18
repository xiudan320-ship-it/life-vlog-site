const ACTION_LABELS = Object.freeze({
  favorite: "收藏",
  edit: "编辑",
  category: "分类",
  feature: "设为精选",
  unfeature: "取消精选",
  pin: "置顶",
  unpin: "取消置顶",
  delete: "删除",
});

function action(id, overrides = {}) {
  return Object.freeze({ id, label: ACTION_LABELS[id] || id, ...overrides });
}

/**
 * Maps the current user's permissions and the photo state to one stable
 * mobile action model. The view only renders this model; it does not infer
 * ownership or permission from individual buttons.
 */
export function getDiaryActionModel({
  signedIn = false,
  isOwner = false,
  isAdmin = false,
  isPinned = false,
  isFavorite = false,
} = {}) {
  if (!signedIn) return Object.freeze({ favorite: null, primary: null, more: Object.freeze([]) });

  const favorite = action("favorite", { pressed: Boolean(isFavorite) });
  const primary = isOwner
    ? action("edit")
    : isAdmin
      ? action("category")
      : null;
  const more = [];
  if (isPinned && isAdmin) more.push(action("unpin"));
  if (isOwner || isAdmin) more.push(action("delete", { danger: true }));

  return Object.freeze({
    favorite,
    primary,
    more: Object.freeze(more),
  });
}

export function getDiaryActionIds(model) {
  return [model?.favorite, model?.primary, ...(model?.more || [])]
    .filter(Boolean)
    .map((item) => item.id);
}

export function getDesktopDiaryActionModel({
  signedIn = false,
  isOwner = false,
  isAdmin = false,
  isPinned = false,
  isFeatured = false,
  isFavorite = false,
} = {}) {
  if (!signedIn) return Object.freeze({ favorite: null, more: Object.freeze([]) });

  const more = [];
  if (isOwner) {
    more.push(action("edit"));
    more.push(action(isFeatured ? "unfeature" : "feature"));
    more.push(action(isPinned ? "unpin" : "pin"));
    more.push(action("delete", { danger: true }));
  } else if (isAdmin) {
    more.push(action("category"));
    if (isPinned) more.push(action("unpin", { adminUnpin: true }));
    more.push(action("delete", { danger: true }));
  }

  return Object.freeze({
    favorite: action("favorite", { pressed: Boolean(isFavorite) }),
    more: Object.freeze(more),
  });
}
