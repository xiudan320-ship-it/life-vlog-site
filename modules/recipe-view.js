import { escapeHtml } from "./ui-formatters.js";

export function formatRecipeDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function renderRecipeCover(recipe) {
  if (recipe.coverImage) {
    return `
      <div class="recipe-cover">
        <img class="recipe-cover-backdrop" src="${escapeHtml(recipe.coverImage)}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <img class="recipe-cover-image" src="${escapeHtml(recipe.coverImage)}" alt="${escapeHtml(recipe.name)} 封面" loading="lazy" decoding="async" />
      </div>
    `;
  }
  return `<div class="recipe-cover placeholder"><span>${escapeHtml(recipe.name.slice(0, 1))}</span></div>`;
}

export function renderSeasonings(seasonings = []) {
  if (!seasonings.length) return "";
  return `
    <div class="seasoning-tags">
      ${seasonings.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

export function renderRecipeList(items, emptyText) {
  if (!items?.length) return `<p class="recipe-empty">${escapeHtml(emptyText)}</p>`;
  return `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function renderRecipeCards(recipes, { getAuthorName, canManageItem }) {
  return recipes
    .map((recipe, index) => {
      const canManage = canManageItem(recipe);
      return `
        <article class="recipe-card">
          <div class="recipe-card-head">
            <span>${String(index + 1).padStart(2, "0")}</span>
            ${canManage ? `<div>
              <button type="button" data-edit-recipe="${escapeHtml(recipe.id)}">编辑</button>
              <button type="button" data-delete-recipe="${escapeHtml(recipe.id)}">删除</button>
            </div>` : ""}
          </div>
          ${renderRecipeCover(recipe)}
          <div class="recipe-card-content">
            <p class="kicker">${escapeHtml(recipe.category)} · ${formatRecipeDate(recipe.createdAt)} · ${escapeHtml(getAuthorName(recipe.userId))}</p>
            <h3>${escapeHtml(recipe.name)}</h3>
            <div class="recipe-meta">
              ${recipe.time ? `<span>${escapeHtml(recipe.time)}</span>` : ""}
              ${recipe.servings ? `<span>${escapeHtml(recipe.servings)}</span>` : ""}
            </div>
            ${renderSeasonings(recipe.seasonings)}
            <div class="recipe-columns">
              <section>
                <strong>食材</strong>
                ${renderRecipeList(recipe.ingredients, "还没写食材")}
              </section>
              <section>
                <strong>步骤</strong>
                ${renderRecipeList(recipe.steps, "还没写步骤")}
              </section>
            </div>
            ${recipe.note ? `<p class="recipe-note">${escapeHtml(recipe.note)}</p>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderRecipesView({
  listElement,
  recipes = [],
  signedIn = false,
  getAuthorName,
  canManageItem,
  onEdit,
  onDelete,
}) {
  if (!listElement) return;
  if (!signedIn) {
    listElement.innerHTML = `<div class="empty">登录后可以记录自己的菜谱。</div>`;
    return;
  }
  if (!recipes.length) {
    listElement.innerHTML = `<div class="empty">还没有菜谱。先记录一道最近想复刻的菜。</div>`;
    return;
  }
  listElement.innerHTML = renderRecipeCards(recipes, { getAuthorName, canManageItem });
  listElement.querySelectorAll("button[data-edit-recipe]").forEach((button) => {
    button.addEventListener("click", () => onEdit(button.dataset.editRecipe));
  });
  listElement.querySelectorAll("button[data-delete-recipe]").forEach((button) => {
    button.addEventListener("click", () => onDelete(button.dataset.deleteRecipe));
  });
}
