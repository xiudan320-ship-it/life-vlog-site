import "../../wardrobe.css";
import { createWardrobeController } from "../wardrobe-controller.js";
import template from "./templates/wardrobe.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export const requiresControllerOptions = true;

export function mount(context) { mountRouteTemplate({ ...context, page: "wardrobe", html: template }); }

export function initialize({ controllers, controllerOptions, elements }) {
  if (!controllers.wardrobe) {
    controllers.wardrobe = createWardrobeController({
      ...controllerOptions.wardrobe,
      root: elements?.wardrobeRoot,
    });
  }
}
export function bind() {}
export function activate({ controllers }) {
  void controllers.wardrobe?.load?.();
}
