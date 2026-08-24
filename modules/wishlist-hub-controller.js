export function createWishlistHubController({ elements, renderWishes, renderShopping }) {
  let activeModule = "wishlist";

  function show(moduleName = "wishlist") {
    activeModule = moduleName === "shopping" ? "shopping" : "wishlist";
    const showingShopping = activeModule === "shopping";
    elements.wishlistContent.hidden = showingShopping;
    elements.shoppingContent.hidden = !showingShopping;
    elements.wishlistPageKicker.textContent = showingShopping ? "Buy List" : "Wishlist";
    elements.wishlistPageTitle.textContent = showingShopping ? "购物车" : "心愿单";
    elements.wishlistStatus.hidden = showingShopping;
    elements.shoppingStatus.hidden = !showingShopping;
    elements.wishlistModuleTabs.querySelectorAll("[data-wishlist-module]").forEach((button) => {
      const selected = button.dataset.wishlistModule === activeModule;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    if (showingShopping) renderShopping();
    else renderWishes();
  }

  function bind() {
    elements.wishlistModuleTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-wishlist-module]");
      if (button) show(button.dataset.wishlistModule);
    });
  }

  return {
    bind,
    getActiveModule: () => activeModule,
    show,
    showWishlist: () => show("wishlist"),
    showShopping: () => show("shopping"),
  };
}
