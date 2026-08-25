function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `¥${amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function formatCreatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function renderShoppingItems({
  listElement,
  filtersElement,
  allCountElement,
  openCountElement,
  doneCountElement,
  items,
  activeFilter,
  signedIn,
  dataState,
  canManageItem,
  escapeHtml,
}) {
  const openCount = items.filter((item) => !item.completed).length;
  const doneCount = items.length - openCount;
  allCountElement.textContent = String(items.length);
  openCountElement.textContent = String(openCount);
  doneCountElement.textContent = String(doneCount);

  filtersElement.querySelectorAll("[data-shopping-filter]").forEach((button) => {
    const selected = button.dataset.shoppingFilter === activeFilter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  if (!signedIn) {
    listElement.innerHTML = '<div class="shopping-empty"><span aria-hidden="true">🛒</span><strong>登录后开始记录想买的东西</strong></div>';
    return;
  }
  if (dataState === "loading") {
    listElement.innerHTML = '<div class="shopping-empty"><span aria-hidden="true">…</span><strong>正在读取购物车</strong></div>';
    return;
  }

  const visibleItems = items.filter((item) => {
    if (activeFilter === "open") return !item.completed;
    if (activeFilter === "done") return item.completed;
    return true;
  });
  if (!visibleItems.length) {
    const message = items.length
      ? activeFilter === "done"
        ? "还没有已经买到的商品。"
        : "待购买清单已经完成啦。"
      : "购物车还是空的，把想买的东西放进来吧。";
    listElement.innerHTML = `<div class="shopping-empty"><span aria-hidden="true">🛒</span><strong>${message}</strong><button class="primary" type="button" data-add-shopping>+ 添加商品</button></div>`;
    return;
  }

  listElement.innerHTML = visibleItems.map((item) => {
    const manageable = canManageItem(item);
    const name = escapeHtml(item.name || "未命名商品");
    const link = item.link
      ? `<a class="shopping-card-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">查看商品链接 ↗</a>`
      : "";
    const image = item.imageUrl
      ? `<button class="shopping-card-image-button" type="button" data-shopping-image="${escapeHtml(item.imageUrl)}" data-shopping-image-alt="${name}" aria-label="查看${name}大图">
          <img src="${escapeHtml(item.imageUrl)}" alt="${name}" loading="lazy" />
        </button>`
      : '<span class="shopping-card-placeholder" aria-hidden="true">🛍</span>';
    return `
      <article class="shopping-card${item.completed ? " completed" : ""}" data-shopping-id="${escapeHtml(item.id)}">
        <div class="shopping-card-image">${image}</div>
        <div class="shopping-card-body">
          <div class="shopping-card-heading">
            <h3>${name}</h3>
            ${item.completed ? '<span class="shopping-completed-mark">✓ 已购买</span>' : ""}
          </div>
          ${formatPrice(item.price) ? `<strong class="shopping-card-price">${formatPrice(item.price)}</strong>` : ""}
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
          ${link}
          <small>${formatCreatedAt(item.createdAt)} 加入</small>
        </div>
        ${manageable ? `<div class="shopping-card-actions">
          <button type="button" data-toggle-shopping="${escapeHtml(item.id)}">${item.completed ? "取消完成" : "完成"}</button>
          <button type="button" data-edit-shopping="${escapeHtml(item.id)}">编辑</button>
          <button type="button" data-delete-shopping="${escapeHtml(item.id)}">删除</button>
        </div>` : ""}
      </article>`;
  }).join("");
}
