import { createMoodEntryOverlayController } from "/modules/mood-entry-overlay-controller.js";
import * as domain from "/modules/mood-diary-domain.js";

const elements = Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => [element.id, element]));
const fixture = window.fixture = { writes: [], rows: [], pointerId: null };
const controller = fixture.controller = createMoodEntryOverlayController({
  elements, domain,
  repository: {
    listDay: async () => fixture.rows,
    upsert: async (record) => {
      if (fixture.rejectNextSave) {
        await new Promise((resolve) => { fixture.releaseSave = resolve; });
        fixture.rejectNextSave = false;
        throw new Error("合成网络错误");
      }
      const saved = { ...record, id: "fixture-mood", user_id: "fixture-user" };
      fixture.writes.push(saved);
      fixture.rows = [saved];
      return saved;
    },
  },
  getSession: () => ({ user: { id: "fixture-user" } }),
  getTodayKey: () => "2030-06-15",
  getAuthorName: () => "合成测试成员",
  confirmAction: async () => {
    fixture.confirmations = (fixture.confirmations || 0) + 1;
    return true;
  },
  onMutation: async () => true,
});
fixture.open = () => controller.open({ dateKey: "2030-06-15", entries: [], participants: [{ userId: "fixture-user" }], trigger: elements.openPicker });
elements.openPicker.addEventListener("click", () => { void fixture.open(); });
elements.moodPickerOrbit.addEventListener("pointerdown", (event) => { fixture.pointerId = event.pointerId; });
await fixture.open();
fixture.ready = true;
