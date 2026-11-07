import { getPlayerExperienceRequired } from "./progression-domain.js";

const assets = "/monster/assets/";

export function createMonsterGameView({ warView }) {
  const { cc, ccui, ccs } = globalThis;
  const frame = document.getElementById("monsterFrame");
  const status = document.getElementById("monsterStatus");
  const controls = Object.fromEntries(["Enter", "Adventure", "Role", "Bag"].map((name) => [name, document.getElementById(`monster${name}`)]));
  // Names use the accessible HTML form; the legacy canvas IME input is unused.
  document.getElementById("imeDispatcherInput")?.setAttribute("inert", "");
  document.getElementById("monsterCanvas").tabIndex = -1;
  let actions;
  let hasSave = false;
  let phase = "loading";
  let serial = 0;
  let nodes = new Map();
  let lastRender;
  let size = { width: 0, height: 0 };

  function stage(value) {
    phase = value;
    document.body.dataset.monsterStage = value;
    controls.Enter.disabled = value === "battle" || value === "loading" || value === "error";
    controls.Enter.textContent = value === "menu" ? hasSave ? "继续游戏" : "开始游戏" : "返回主页";
    for (const key of ["Adventure", "Role", "Bag"]) controls[key].disabled = value !== "home" && value !== "result";
  }
  function resize() {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (!width || !height || (width === size.width && height === size.height)) return;
    size = { width, height };
    cc.view.setFrameSize(width, height);
    // Original AppDelegate: 640x960, EXACT_FIT below 1.5, FIXED_WIDTH otherwise.
    cc.view.setDesignResolutionSize(640, 960, height / width < 1.5 ? cc.ResolutionPolicy.EXACT_FIT : cc.ResolutionPolicy.FIXED_WIDTH);
    if (lastRender) void lastRender().catch((error) => notice(error.message));
  }
  cc.view.enableRetina(true);
  cc.view.adjustViewPort(false);
  resize();
  new ResizeObserver(resize).observe(frame);

  function notice(message) { status.textContent = message; }
  function walk(root, callback) { callback(root); for (const child of root.getChildren?.() || []) walk(child, callback); }
  function find(root, name) { let match; walk(root, (node) => { if (!match && node.getName?.() === name) match = node; }); return match; }
  function text(root, name, value) { find(root, name)?.setString(String(value)); }
  function click(node, action) {
    if (!node) return;
    node.setTouchEnabled(true);
    node.addTouchEventListener((_, type) => { if (type === ccui.Widget.TOUCH_ENDED) action(); });
  }
  async function load(file) {
    const url = `${assets}ui/${file}.json`;
    const json = await new Promise((resolve, reject) => cc.loader.loadJson(url, (error, value) => error ? reject(new Error(String(error))) : resolve(value)));
    const resources = new Set([url]);
    function scan(value) {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "path" && typeof child === "string" && child) resources.add(`${assets}ui/${child}`);
        else if (typeof child === "object") scan(child);
      }
    }
    scan(json);
    await new Promise((resolve, reject) => cc.loader.load([...resources], (error) => error ? reject(new Error(String(error))) : resolve()));
    const widget = ccs.load(url).node;
    if (!widget) throw new Error("原界面无法载入");
    return widget;
  }
  function scene(root) { const scene = new cc.Scene(); scene.addChild(root); cc.director.runScene(scene); return scene; }
  function enter() {
    if (phase !== "menu") { actions.continue(); return; }
    if (hasSave) actions.continue();
    else document.getElementById("monsterNewGame").showModal();
  }
  async function menu(saved) {
    hasSave = saved;
    const request = ++serial;
    const widget = await load("menu_layer");
    await new Promise((resolve, reject) => cc.loader.load([`${assets}img/logo.png`], (error) => error ? reject(new Error(String(error))) : resolve()));
    if (request !== serial) return;
    find(widget, "img_gamelogo")?.setVisible(false);
    find(widget, "btn_new")?.setVisible(false);
    find(widget, "btn_changelanguage")?.setVisible(false);
    find(widget, "btn_start")?.setTitleText(saved ? "继续游戏" : "开始游戏");
    click(find(widget, "btn_start"), enter);
    const current = scene(widget);
    const logo = new ccui.ImageView(`${assets}img/logo.png`);
    logo.setPosition(320, 770);
    current.addChild(logo, 10);
    lastRender = () => menu(saved);
    stage("menu");
    notice("首关迁移测试：可战斗、升级、查看初始装备和材料，自动保存在本机。");
  }
  async function home(state, catalog) {
    const request = ++serial;
    const [header, content] = await Promise.all([load("main_layer"), load("main_main_layer")]);
    if (request !== serial) return;
    walk(content, (node) => {
      if (node instanceof ccui.Button && node.getName() !== "btn_map") node.setVisible(false);
    });
    click(find(content, "btn_map"), () => actions.startFirstCopy());
    text(header, "label_name", state.player.name);
    text(header, "text_level", `等级${state.player.level}`);
    find(header, "label_level")?.setVisible(false);
    text(header, "label_gold", state.gold);
    text(header, "label_money", state.money);
    text(header, "label_special", 0);
    text(header, "label_exp", `${state.player.experience}/${getPlayerExperienceRequired(state.player.level)}`);
    find(header, "bar_exp")?.setPercent(state.player.experience / getPlayerExperienceRequired(state.player.level) * 100);
    for (const name of ["label_achevement", "label_achevementdesc", "label_id", "btn_share", "btn_rename"]) find(header, name)?.setVisible(false);
    walk(header, (node) => {
      if (!(node instanceof ccui.Button)) return;
      const handler = { btn_main: () => actions.continue(), btn_role: () => actions.role(), btn_bag: () => actions.bag() }[node.getName()];
      if (handler) click(node, handler);
      else { node.setEnabled(false); node.setBright(false); }
    });
    const current = new cc.Scene();
    current.addChild(content, 0);
    current.addChild(header, 10);
    for (const child of header.getChildren()) if (child.y > 650) child.y += cc.winSize.height - 960;
    cc.director.runScene(current);
    lastRender = () => home(state, catalog);
    stage("home");
    notice(`${state.player.name} · Lv.${state.player.level} · 金币 ${state.gold} · 已开放关卡 ${state.progress.levelId}`);
  }
  async function battle(initial, state, catalog) {
    const request = ++serial;
    const files = warView.layouts[0].nodes.filter((node) => node.asset).map((node) => assets + node.asset);
    await new Promise((resolve, reject) => cc.loader.load(files, (error) => error ? reject(new Error(String(error))) : resolve()));
    if (request !== serial) return;
    const low = warView.layouts[0];
    const high = new Map(warView.layouts[1].nodes.map((node) => [node.id, node]));
    const factor = (cc.winSize.height - low.height) / (warView.layouts[1].height - low.height);
    nodes = new Map();
    function configure(node, spec) {
      const upper = high.get(spec.id);
      if (spec.position) node.setPosition(...spec.position.map((value, i) => value + (upper.position[i] - value) * factor));
      if (spec.anchor) node.setAnchorPoint(...spec.anchor);
      if (spec.scale !== undefined) node.setScale(spec.scale);
      if (spec.color) node.setColor(cc.color(...spec.color));
      if (spec.tag !== undefined) node.setTag(spec.tag);
      return node;
    }
    for (const spec of low.nodes) {
      if (spec.kind === "ProgressTimer") continue;
      const node = spec.kind === "Sprite" ? new cc.Sprite(assets + spec.asset)
        : spec.kind === "Text" ? new ccui.Text(spec.text || "", "Arial", spec.fontSize || 24) : new cc.Node();
      nodes.set(spec.id, configure(node, spec));
    }
    for (const spec of low.nodes.filter((node) => node.kind === "ProgressTimer")) {
      const timer = new cc.ProgressTimer(nodes.get(spec.sprite));
      timer.setType(cc.ProgressTimer.TYPE_BAR);
      timer.setMidpoint(cc.p(...spec.midpoint));
      timer.setBarChangeRate(cc.p(...spec.barChangeRate));
      timer.setPercentage(100);
      nodes.set(spec.id, configure(timer, spec));
    }
    for (const spec of low.nodes) for (const child of spec.children) {
      const childSpec = low.nodes.find((candidate) => candidate.id === child);
      nodes.get(spec.id).addChild(nodes.get(child), childSpec.z || 0);
    }
    scene(nodes.get(warView.root));
    stage("battle");
    battleUpdate(initial, null, state, catalog);
  }
  function battleUpdate(value, hit, state, catalog) {
    const bound = (key) => nodes.get(warView.bindings[key]);
    const enemy = value.enemies[value.currentEnemyIndex];
    const player = value.allies[0];
    const row = catalog.enemies.find((entry) => entry.id === enemy.id);
    bound("wave").setString(`${value.wave}/${value.enemies.length}`);
    bound("enemyName").setString(`Lv.${enemy.level} ${row.name}${["", "", "[精英]", "[变异]"][enemy.quality] || ""}`);
    bound("enemyName").setColor(enemy.quality === 2 ? cc.color(255, 127, 0) : enemy.quality === 3 ? cc.color(214, 14, 154) : cc.color.WHITE);
    bound("enemyHp").setString(`${enemy.hp}/${enemy.maxHp}`);
    bound("enemyBar").setPercentage(enemy.hp / enemy.maxHp * 100);
    bound("playerName").setString(`Lv.${player.level} ${state.player.name}`);
    bound("playerHp").setString(`${player.hp}/${player.maxHp}`);
    bound("playerBar").setPercentage(player.hp / player.maxHp * 100);
    if (hit) {
      const target = bound(hit.target.side === "allies" ? "player" : "enemy");
      const label = new ccui.Text(hit.hpBefore === hit.hpAfter ? "闪避" : String(hit.hpBefore - hit.hpAfter), "Arial", 32);
      label.setColor(cc.color(255, 70, 70));
      label.setPosition(0, 100);
      target.addChild(label, 50);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(() => label.removeFromParent(), 500);
      else label.runAction(cc.sequence(cc.spawn(cc.moveBy(0.5, cc.p(0, 45)), cc.fadeOut(0.5)), cc.removeSelf()));
    }
    lastRender = () => battle(value, state, catalog);
    notice(`战斗中 · 生命 ${player.hp}/${player.maxHp} · 结算后自动保存`);
  }
  async function result(outcome, reward, state, catalog) {
    const request = ++serial;
    const resultImage = `${assets}img/${outcome === 3 ? "win" : "lost"}.png`;
    const [widget] = await Promise.all([
      load("war_result_layer"),
      new Promise((resolve, reject) => cc.loader.load([resultImage], (error) => error ? reject(new Error(String(error))) : resolve())),
    ]);
    if (request !== serial) return;
    // WarFinishLayer::initUi centers the adaptive root and uses its anchor.
    widget.setAnchorPoint(0.5, 0.5);
    widget.ignoreAnchorPointForPosition(false);
    widget.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
    for (const name of ["img_warfail", "btn_upatt1", "btn_upatt2", "btn_upatt3", "btn_upatt4", "btn_upatt5", "btn_upatt6"]) find(widget, name)?.setVisible(false);
    const banner = find(widget, "img_result");
    banner.loadTexture(resultImage);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) banner.setScale(1.4);
    else {
      banner.setScale(0.6);
      banner.runAction(cc.sequence(cc.scaleTo(0.2, 1.5), cc.scaleTo(0.03, 1.4)));
    }
    for (const [name, value] of [["img_coinbg", reward.gold], ["img_expbg", reward.experience], ["img_honorbg", reward.honor]]) {
      const container = find(widget, name);
      const label = new ccui.Text(String(value), "Arial", 30);
      label.setPosition(container.width / 2, container.height / 2);
      container.addChild(label, 20);
    }
    text(widget, "text_endresult", reward.items.length ? reward.items.map((item) => `${catalog.items.find((row) => row.id === item.id).name} ×${item.quantity}`).join("  ") : "未获得物品");
    click(widget, () => actions.continue());
    scene(widget);
    lastRender = () => result(outcome, reward, state, catalog);
    stage("result");
    notice(`${outcome === 3 ? "胜利" : "战斗结束"} · 金币 +${reward.gold} · 经验 +${reward.experience} · 当前 Lv.${state.player.level}`);
  }
  function details(title, opener) {
    document.getElementById("monsterDetailsTitle").textContent = title;
    const content = document.getElementById("monsterDetailsContent");
    content.replaceChildren();
    const dialog = document.getElementById("monsterDetails");
    dialog.addEventListener("close", () => opener.focus(), { once: true });
    dialog.showModal();
    return content;
  }
  function items(content, entries, catalog, quantities) {
    const grid = document.createElement("div"); grid.className = "monster-items";
    for (const item of entries) {
      const row = catalog.items.find((candidate) => candidate.id === item.id);
      const cell = document.createElement("div"); cell.className = "monster-item";
      const image = document.createElement("img"); image.src = `${assets}icon/item/${row.icon}`; image.alt = "";
      const label = document.createElement("span"); label.textContent = row.name + (quantities ? ` ×${item.quantity}` : "");
      cell.append(image, label); grid.append(cell);
    }
    content.append(grid);
  }
  function role(state, catalog) {
    const content = details(`${state.player.name} · Lv.${state.player.level}`, controls.Role);
    const stats = document.createElement("div"); stats.className = "monster-stats";
    for (const [key, label] of [["attack", "攻击"], ["defense", "防御"], ["maxHp", "生命"], ["hit", "命中"], ["dodge", "闪避"], ["crit", "暴击"], ["critHurt", "暴伤"], ["resistance", "韧性"]]) {
      const row = document.createElement("div"); const name = document.createElement("span"); name.textContent = label; const value = document.createElement("b"); value.textContent = state.player[key]; row.append(name, value); stats.append(row);
    }
    content.append(stats);
    items(content, [...state.player.equipmentSets[state.player.equipmentSetIndex], ...state.inventory.wings], catalog, false);
  }
  function bag(state, catalog) {
    const content = details("背包材料", controls.Bag);
    if (!state.inventory.goods.length) content.textContent = "暂时没有材料，冒险中获得的材料会保存在这里。";
    else items(content, state.inventory.goods, catalog, true);
  }
  return {
    menu, home, battle, battleUpdate, result, role, bag, notice,
    loadError(message) { stage("error"); notice(message); },
    saveStatus(message, error = false) {
      document.getElementById("monsterSaveStatus").textContent = message;
      document.querySelector(".monster-save-line").dataset.error = String(error);
      document.getElementById("monsterSaveRetry").hidden = !error;
    },
    bind(controller) {
      actions = controller;
      controls.Enter.onclick = enter;
      controls.Adventure.onclick = () => actions.startFirstCopy();
      controls.Role.onclick = () => actions.role(); controls.Bag.onclick = () => actions.bag();
      document.getElementById("monsterSaveRetry").onclick = () => actions.save();
      document.getElementById("monsterNewCancel").onclick = () => document.getElementById("monsterNewGame").close();
      document.getElementById("monsterNewGame").addEventListener("close", () => controls.Enter.focus());
      document.getElementById("monsterNewGameForm").onsubmit = (event) => { event.preventDefault(); const name = document.getElementById("monsterName").value.trim(); if (!name) return; hasSave = true; document.getElementById("monsterNewGame").close(); actions.create(name); };
      document.getElementById("monsterDetailsClose").onclick = () => document.getElementById("monsterDetails").close();
    },
  };
}
