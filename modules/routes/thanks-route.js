export function initialize() {}
export function activate({ actions }) {
  actions.renderGratitudeNotes?.();
}
import template from "./templates/thanks.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export function mount(context) { mountRouteTemplate({ ...context, page: "thanks", html: template }); }
export function bind({ bindRouteEvents }) {
  bindRouteEvents?.("thanks");
}
