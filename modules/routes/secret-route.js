import "../../styles/secret-gallery.css";
import "../../styles/secret-filters.css";
import "../../secret-viewer.css";
import { createSecretController } from "../secret-controller.js";
import template from "./templates/secret.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export const requiresControllerOptions = true;

export function mount(context) { mountRouteTemplate({ ...context, page: "secret", html: template }); }

export function initialize({ controllers, controllerOptions }) {
  if (!controllers.secret) controllers.secret = createSecretController(controllerOptions.secret);
}
export function bind({ bindRouteEvents }) {
  bindRouteEvents?.("secret");
}
export function activate({ controllers, actions, state }) {
  actions.applyMobileSecretLayout?.();
  if (!state.secretItems.length && state.session) actions.renderCachedSecretItems?.(state.session.user.id);
  controllers.secret?.renderSecretGallery?.();
  if (state.session && state.cloudDb && Date.now() - state.lastSecretSyncAt > 60_000) {
    void controllers.secret?.loadSecretItems?.();
  }
}
