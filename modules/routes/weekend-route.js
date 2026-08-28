import "../../weekend-board.css";
import { createWeekendController } from "../weekend-controller.js";
import template from "./templates/weekend.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export const requiresControllerOptions = true;

export function mount(context) { mountRouteTemplate({ ...context, page: "weekend", html: template }); }

export function initialize({ controllers, controllerOptions, state }) {
  if (controllers.weekend) return;
  const controller = createWeekendController(controllerOptions.weekend);
  controllers.weekend = controller;
  controllerOptions.weekend.setPlans(
    state?.weekendCloudAvailable ? state.weekendPlans : controller.load()
  );
  controller.resetForm();
}
export function bind({ bindRouteEvents }) {
  bindRouteEvents?.("weekend");
}
export function activate({ controllers }) {
  controllers.weekend?.render?.();
}
