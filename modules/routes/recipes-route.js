import { createRecipeController } from "../recipe-controller.js";
import template from "./templates/recipes.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export const requiresControllerOptions = true;

export function mount(context) { mountRouteTemplate({ ...context, page: "recipes", html: template }); }

export function initialize({ controllers, controllerOptions, state }) {
  if (controllers.recipe) return;
  const controller = createRecipeController(controllerOptions.recipe);
  controllers.recipe = controller;
  controllerOptions.recipe.setRecipes(
    state?.accountDataState === "ready" ? state.recipes : controller.load()
  );
}
export function bind({ bindRouteEvents }) {
  bindRouteEvents?.("recipes");
}
export function activate({ controllers }) {
  controllers.recipe?.render?.();
}
