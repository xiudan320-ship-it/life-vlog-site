import "../../styles/monster.css";
import "./bag-item.css";
import { createMonsterSaveStore } from "./save-store.js";
import { createMonsterGameController } from "./game-controller.js";
import { createMonsterGameView } from "./game-view.js";
import { APP_CONFIG } from "../app-config.js";
import { createCloudflareBackend } from "../cloudflare-client.js";

async function json(path) {
  const response = await fetch(`/monster/${path}`);
  if (!response.ok) throw new Error(`资源加载失败（${response.status}）`);
  return response.json();
}

async function boot() {
  const backend = createCloudflareBackend({
    endpoint: APP_CONFIG.apiEndpoint, authKey: APP_CONFIG.authKey,
    backupDb: APP_CONFIG.authBackupDb, backupStore: APP_CONFIG.authBackupStore,
  });
  await backend.restoreSessionBackup();
  if (!backend.readSession()) throw new Error("请先返回咻蛋之家登录，再进入游戏");
  const [items, enemies, skills, copies, chapters, dropGroups, equipmentTemplates, trials, pets, tasks, make, warView] = await Promise.all([
    ...["item", "enemy", "skill", "copy", "chapter", "drop-groups", "equipment-templates", "trial", "pet", "task", "make"].map((name) => json(`data/${name}.json`)),
    json("war-view.json"),
  ]);
  document.ccConfig = {
    debugMode: 0, showFPS: false, frameRate: 60, id: "monsterCanvas", renderMode: 2,
    engineDir: "/monster/engine", modules: ["cocos2d", "cocostudio"], jsList: [],
  };
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/monster/engine/CCBoot.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("游戏引擎加载失败"));
    document.head.append(script);
  });
  await new Promise((resolve) => { globalThis.cc.game.onStart = resolve; globalThis.cc.game.run(); });
  const view = createMonsterGameView({ warView });
  const controller = createMonsterGameController({
    catalog: { items, enemies, skills, copies: copies.map((copy) => ({ ...copy, dropGroups: dropGroups[copy.id] })), chapters, equipmentTemplates, trials, pets, tasks, make },
    store: createMonsterSaveStore({ request: backend.request, getSession: backend.readSession }), view,
    random() { const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0] & 0x7fffffff; },
    wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  });
  view.bind(controller);
  await controller.initialize();
  window.addEventListener("pagehide", (event) => { if (!event.persisted) controller.destroy(); });
  window.addEventListener("pageshow", (event) => { if (event.persisted) { controller.destroy(); void controller.initialize(); } });
  window.addEventListener("storage", (event) => {
    if (event.key === APP_CONFIG.authKey || event.key === null) { controller.destroy(); location.reload(); }
  });
}

boot().catch((error) => {
  document.getElementById("monsterStatus").textContent = `${error.message}，请刷新重试。`;
  document.body.dataset.monsterStage = "error";
});
