import "../../weekend-board.css";
import { createWeekendController } from "../weekend-controller.js";
import template from "./templates/weekend.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export const requiresControllerOptions = true;

export function mount(context) { mountRouteTemplate({ ...context, page: "weekend", html: template }); }

export function initialize({ controllers, controllerOptions }) {
  if (controllers.weekend) return;
  const controller = createWeekendController(controllerOptions.weekend);
  controllers.weekend = controller;
  const plans = controllerOptions.weekend.canSync?.()
    ? controllerOptions.weekend.getPlans?.()
    : controller.load();
  controllerOptions.weekend.setPlans(Array.isArray(plans) ? plans : []);
  controller.resetForm();
}
export function bind({ bindRouteEvents }) {
  bindRouteEvents?.("weekend");
}
export function activate({ controllers }) {
  controllers.weekend?.render?.();
}
