import { createMoodDiaryController } from "../mood-diary-controller.js";
import { createMoodDiaryRepository } from "../mood-diary-repository.js";
import template from "./templates/mood-diary.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export const requiresControllerOptions = true;

export function mount(context) {
  mountRouteTemplate({ ...context, page: "mood", html: template });
}

export function initialize({ controllers, controllerOptions }) {
  if (controllers.moodDiary) return;
  const options = controllerOptions.moodDiary;
  controllers.moodDiary = createMoodDiaryController({
    ...options,
    overlayController: options.overlayController,
    repository: createMoodDiaryRepository({
      getDatabase: options.getDatabase,
      getSession: options.getSession,
    }),
  });
}

export function bind({ controllers }) {
  controllers.moodDiary?.bind?.();
}

export function activate({ controllers }) {
  return controllers.moodDiary?.activate?.();
}
