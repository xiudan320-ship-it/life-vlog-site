import "../../styles/wishlist.css";
import "../../styles/shopping.css";
import { createWishlistController } from "../wishlist-controller.js";
import { createShoppingController } from "../shopping-controller.js";
import { createWishlistHubController } from "../wishlist-hub-controller.js";
import template from "./templates/wishlist.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export const requiresControllerOptions = true;

export function mount(context) { mountRouteTemplate({ ...context, page: "wishlist", html: template }); }

export function initialize({ controllers, controllerOptions }) {
  if (!controllers.wishlist) {
    controllers.wishlist = createWishlistController(controllerOptions.wishlist);
  }
  if (!controllers.shopping) {
    controllers.shopping = createShoppingController(controllerOptions.shopping);
  }
  if (!controllers.wishlistHub) {
    controllers.wishlistHub = createWishlistHubController({
      ...controllerOptions.wishlistHub,
      renderWishes: (...args) => controllers.wishlist.render(...args),
      renderShopping: (...args) => controllers.shopping.render(...args),
    });
  }
}
export function bind({ controllers, bindRouteEvents }) {
  controllers.wishlist?.bind();
  controllers.shopping?.bind();
  controllers.wishlistHub?.bind();
  bindRouteEvents?.("wishlist");
}
export function activate({ controllers }) {
  controllers.wishlistHub?.show(controllers.wishlistHub.getActiveModule());
}
