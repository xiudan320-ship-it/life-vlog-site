import { getPlayerExperienceRequired } from "./progression-domain.js";
import { renderCopySelection } from "./copy-selection-view.js";
import { renderRole, renderBag, renderSkills } from "./character-view.js";
import { readGameInsets, nodeScreenBox, observeVisibleViewport } from "./viewport-view.js";
import { renderTrial } from "./trial-view.js";
import { renderTasks } from "./task-view.js";
import { renderWorkshop, renderUpgrade } from "./smith-view.js";
import { renderCraft } from "./craft-view.js";
import { renderSmelt } from "./smelt-view.js";
import { renderSpecialUpgrade } from "./special-upgrade-view.js";
import { renderGodUpgrade } from "./god-upgrade-view.js";
import { renderBagItem } from "./bag-item-view.js";
import { renderPets } from "./pet-view.js";
import { renderMaterialSources } from "./material-source-view.js";
import { renderCopyScout } from "./copy-scout-view.js";
import { referencePower } from "./copy-scout-domain.js";
import { renderOffline } from "./offline-view.js";
import { renderShop } from "./shop-view.js";

const assets = "/monster/assets/";

export function createMonsterGameView({ warView }) {
  const { cc, ccui, ccs } = globalThis;
  const frame = document.getElementById("monsterFrame");
  const status = document.getElementById("monsterStatus");
  const controls = Object.fromEntries(["Enter", "Adventure", "Role", "Skills", "Bag"].map((name) => [name, document.getElementById(`monster${name}`)]));
  const exitBattle = document.createElement("button");
  exitBattle.id = "monsterExitBattle";
  exitBattle.type = "button";
  exitBattle.textContent = "退出战斗";
  exitBattle.hidden = true;
  const battlePower = document.createElement("div");
  battlePower.id = "monsterBattlePower";
  battlePower.hidden = true;
  document.querySelector(".monster-host-header").append(exitBattle, battlePower);
  // Names use the accessible HTML form; the legacy canvas IME input is unused.
  document.getElementById("imeDispatcherInput")?.setAttribute("inert", "");
  document.getElementById("monsterCanvas").tabIndex = -1;
  let actions;
  let hasSave = false;
  let phase = "loading";
  let repeating = false;
  let exitPending = false;
  let offlineBusy = false;
  let saveErrorStatus = null;
  let serial = 0;
  let nodes = new Map();
  let lastRender;
  let homeHeader;
  let upgradeScreen;
  let craftSelection;
  let shopSelection;
  let size = { width: 0, height: 0 };

  function stage(value) {
    phase = value;
    document.body.dataset.monsterStage = value;
    exitBattle.hidden = value !== "battle" && !(value === "result" && repeating);
    battlePower.hidden = value !== "battle";
    exitBattle.disabled = exitPending;
    controls.Enter.disabled = exitPending || repeating || value === "battle" || value === "loading" || value === "error";
    controls.Enter.textContent = value === "menu" ? hasSave ? "继续游戏" : "开始游戏" : "主页";
    for (const key of ["Adventure", "Role", "Skills", "Bag"]) controls[key].disabled = exitPending || repeating || value !== "home" && value !== "result";
  }
  function resize() {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    const insets = readGameInsets();
    if (!width || !height || (width === size.width && height === size.height && JSON.stringify(insets) === JSON.stringify(size.insets))) return;
    size = { width, height, insets };
    cc.view.setFrameSize(width, height);
    // Original AppDelegate: 640x960, EXACT_FIT below 1.5, FIXED_WIDTH otherwise.
    cc.view.setDesignResolutionSize(640, 960, height / width < 1.5 ? cc.ResolutionPolicy.EXACT_FIT : cc.ResolutionPolicy.FIXED_WIDTH);
    if (lastRender) void lastRender().catch((error) => notice(error.message));
  }
  cc.view.enableRetina(true);
  cc.view.adjustViewPort(false);
  resize();
  new ResizeObserver(resize).observe(frame);
  observeVisibleViewport(resize);

  function statusMessage(message) { status.textContent = message; }
  function notice(message) {
    statusMessage(message);
    document.getElementById("monsterToast")?.remove();
    const toast = document.createElement("p"); toast.id = "monsterToast"; toast.className = "monster-toast";
    toast.setAttribute("role", "status"); toast.textContent = message;
    const dialog = [...document.querySelectorAll("dialog[open]")].at(-1);
    (dialog || document.querySelector("main")).append(toast);
    setTimeout(() => toast.remove(), 4000);
  }
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
    const resources = new Set([url, `${assets}ui/bg/main_bg.jpg`]);
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
    // Native layouts use a 640x960 design. Preserve their authored coordinates
    // when adapting the top HUD; percentage layout must not undo the offset.
    for (const child of widget.getChildren()) if (child instanceof ccui.Widget) child.setPositionType(ccui.Widget.POSITION_ABSOLUTE);
    return widget;
  }
  function scene(root, dim = false) {
    const scene = new cc.Scene();
    const background = new cc.Sprite(`${assets}ui/bg/main_bg.jpg`);
    background.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
    background.setScale(Math.max(cc.winSize.width / background.width, cc.winSize.height / background.height));
    scene.addChild(background, -10);
    if (dim) scene.addChild(new cc.LayerColor(cc.color(0, 0, 0, 171)), -5);
    scene.addChild(root); cc.director.runScene(scene); return scene;
  }
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
    find(widget, "btn_start")?.setVisible(false);
    click(find(widget, "btn_start"), enter);
    const current = scene(widget);
    const logo = new ccui.ImageView(`${assets}img/logo.png`);
    logo.setPosition(320, cc.winSize.height * 0.76);
    current.addChild(logo, 10);
    lastRender = () => menu(saved);
    stage("menu");
    statusMessage("游戏进度随登录账号保存在云端，每场结算后自动保存。");
  }
  function homeStats(header, state) {
    text(header, "label_name", state.player.name);
    text(header, "text_level", `等级${state.player.level}`);
    find(header, "label_level")?.setVisible(false);
    text(header, "label_gold", state.gold);
    text(header, "label_money", state.money);
    text(header, "label_special", 0);
    text(header, "label_exp", `${state.player.experience}/${getPlayerExperienceRequired(state.player.level)}`);
    find(header, "bar_exp")?.setPercent(state.player.experience / getPlayerExperienceRequired(state.player.level) * 100);
  }
  function updateHome(state, catalog) {
    if (phase !== "home" || !homeHeader) return;
    homeStats(homeHeader, state);
    lastRender = () => home(state, catalog);
  }
  async function home(state, catalog) {
    const request = ++serial;
    const [header, content] = await Promise.all([load("main_layer"), load("main_main_layer")]);
    if (request !== serial) return;
    const adventureButtons = { btn_map: 1, btn_copy: 2, btn_abyss: 5, btn_boss: 3, btn_trial: 6 };
    walk(content, (node) => {
      if (!(node instanceof ccui.Button)) return;
      const type = adventureButtons[node.getName()];
      const handler = { btn_task: () => actions.tasks(), btn_blacksmith: () => actions.workshop(), btn_strength: () => actions.workshop(), btn_pet: () => actions.pets(), btn_shop: () => actions.shop() }[node.getName()];
      node.setVisible(Boolean(type || handler));
      if (type) click(node, () => actions.selectCopy(type));
      else if (handler) { find(node, "img_lock")?.setVisible(node.getName() === "btn_pet" && state.player.level < 35); click(node, handler); }
    });
    homeHeader = header;
    homeStats(header, state);
    for (const name of ["label_achevement", "label_achevementdesc", "label_id", "btn_share", "btn_rename"]) find(header, name)?.setVisible(false);
    walk(header, (node) => {
      if (!(node instanceof ccui.Button)) return;
      const handler = { btn_main: () => actions.continue(), btn_role: () => actions.role(), btn_bag: () => actions.bag(), btn_skill: () => actions.skills() }[node.getName()];
      if (handler) click(node, handler);
      else { node.setEnabled(false); node.setBright(false); }
      if (["btn_main", "btn_role", "btn_bag", "btn_skill", "btn_others"].includes(node.getName())) node.setVisible(false);
    });
    const current = new cc.Scene();
    const background = new cc.Sprite(`${assets}ui/bg/main_bg.jpg`);
    background.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
    background.setScale(Math.max(cc.winSize.width / background.width, cc.winSize.height / background.height));
    current.addChild(background, -10);
    current.addChild(content, 0);
    current.addChild(header, 10);
    let safeTop = readGameInsets().top * cc.winSize.height / frame.clientHeight;
    content.removeBackGroundImage();
    content.setBackGroundColorType(ccui.Layout.BG_COLOR_NONE);
    const topNodes = header.getChildren().filter((child) => child.y > 650);
    for (const child of topNodes) child.y += cc.winSize.height - 960 - safeTop;
    const levelBox = nodeScreenBox(find(header, "text_level"), frame, cc);
    const back = document.querySelector(".monster-host-header a").getBoundingClientRect();
    const gap = Math.max(0, back.bottom + 8 - levelBox.top) * cc.winSize.height / frame.clientHeight;
    for (const child of topNodes) child.y -= gap;
    safeTop += gap;
    for (const child of content.getChildren()) child.y = child.getName() === "img_titlebg" ? cc.winSize.height - 145 - safeTop : child.y + (cc.winSize.height - 960) / 2;
    cc.director.runScene(current);
    lastRender = () => home(state, catalog);
    stage("home");
    statusMessage(`${state.player.name} · Lv.${state.player.level} · 金币 ${state.gold} · 已开放关卡 ${state.progress.levelId}`);
  }
  async function battle(initial, state, catalog) {
    document.getElementById("monsterDetails").close();
    const request = ++serial;
    const files = [...new Set([...warView.layouts[0].nodes.filter((node) => node.asset).map((node) => assets + node.asset), ...initial.enemies.map((enemy) => `${assets}enemy/${catalog.enemies.find((row) => row.id === enemy.id).img}`)])];
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
      if (spec.asset === "img/layer_bg7.png") node.setScale(Math.max(spec.scale || 1, cc.winSize.width / node.width, cc.winSize.height / node.height));
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
    const petCount = initial.petPassives?.length || 0;
    battlePower.textContent = `战力 ${referencePower(state.player).toLocaleString("zh-CN")}${petCount ? ` · 助战 ${petCount}` : ""}`;
    stage("battle");
    const enemyBox = nodeScreenBox(nodes.get(warView.bindings.enemyName), frame, cc);
    const back = exitBattle.getBoundingClientRect();
    const shift = Math.max(0, back.bottom + 8 - enemyBox.top) * cc.winSize.height / frame.clientHeight;
    for (const spec of low.nodes) if (spec.position?.[1] >= 720) nodes.get(spec.id).y -= shift;
    battleUpdate(initial, null, state, catalog);
  }
  function battleUpdate(value, hit, state, catalog) {
    const bound = (key) => nodes.get(warView.bindings[key]);
    const enemy = value.enemies[value.currentEnemyIndex];
    const player = value.allies[0];
    const row = catalog.enemies.find((entry) => entry.id === enemy.id);
    bound("enemy").getChildren()[0].setTexture(`${assets}enemy/${row.img}`);
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
    const petCount = value.petPassives?.length || 0;
    statusMessage(`战斗中 · 生命 ${player.hp}/${player.maxHp}${petCount ? ` · 宠物助战 ${petCount} 项` : ""} · 结算后自动保存`);
  }
  async function result(outcome, reward, state, catalog) {
    const request = ++serial;
    const resultImage = `${assets}img/${outcome === 3 ? "win" : "lost"}.png`;
    const loot = reward.items.slice(0, 12).map((item) => ({ item, row: catalog.items.find((row) => row.id === item.id) }));
    const [widget] = await Promise.all([
      load("war_result_layer"),
      new Promise((resolve, reject) => cc.loader.load([resultImage, `${assets}bg/package_bg.png`, ...loot.map(({ row }) => `${assets}icon/item/${row.icon}`)], (error) => error ? reject(new Error(String(error))) : resolve())),
    ]);
    if (request !== serial) return;
    // WarFinishLayer::initUi centers the adaptive root and uses its anchor.
    widget.setAnchorPoint(0.5, 0.5);
    widget.ignoreAnchorPointForPosition(false);
    const insets = readGameInsets();
    const top = document.querySelector(".monster-host-header a").getBoundingClientRect().bottom + 8;
    const bottom = Math.max(document.querySelector(".monster-controls").getBoundingClientRect().height, insets.bottom) + 8;
    const usable = Math.max(1, frame.clientHeight - top - bottom);
    widget.setScale(Math.min(1, usable / frame.clientHeight * cc.winSize.height / 960));
    widget.setPosition(cc.winSize.width / 2, (bottom + usable / 2) / frame.clientHeight * cc.winSize.height);
    widget.setBackGroundColorType(ccui.Layout.BG_COLOR_NONE);
    for (const name of ["img_warfail", "btn_upatt1", "btn_upatt2", "btn_upatt3", "btn_upatt4", "btn_upatt5", "btn_upatt6"]) find(widget, name)?.setVisible(false);
    const banner = find(widget, "img_result");
    banner.loadTexture(resultImage);
    const finalScale = Math.min(1.4, (banner.x - 16) * 2 / banner.width);
    const ring = find(widget, "img_resultbg");
    if (ring) ring.x = Math.max(ring.x, ring.width / 2 + 12);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) banner.setScale(finalScale);
    else {
      banner.setScale(0.6);
      banner.runAction(cc.sequence(cc.scaleTo(0.2, Math.min(finalScale + 0.1, (banner.x - 8) * 2 / banner.width)), cc.scaleTo(0.03, finalScale)));
    }
    for (const [name, value] of [["img_coinbg", reward.gold], ["img_expbg", reward.experience], ["img_honorbg", reward.honor]]) {
      const container = find(widget, name);
      const label = new ccui.Text(String(value), "Arial", 30);
      label.setPosition(container.width / 2, container.height / 2);
      container.addChild(label, 20);
    }
    text(widget, "text_endresult", loot.length ? "获得物品" : "未获得物品");
    if (reward.partial) {
      text(widget, "text_backtips", `战败 · 已保留 ${reward.defeatedCount} 只怪物收益\n点击返回`);
      find(widget, "text_backtips")?.setFontSize(24);
    }
    loot.forEach(({ item, row }, index) => {
      const frame = new ccui.ImageView(`${assets}bg/package_bg.png`);
      frame.setPosition(95 + index % 6 * 90, 410 - Math.floor(index / 6) * 100);
      const icon = new ccui.ImageView(`${assets}icon/item/${row.icon}`);
      icon.setScale(58 / Math.max(icon.width, icon.height)); icon.setPosition(frame.width / 2, frame.height / 2); frame.addChild(icon);
      const quantity = new ccui.Text(String(item.quantity ?? 1), "Arial", 22); quantity.setPosition(frame.width - 12, 12); frame.addChild(quantity);
      widget.addChild(frame, 30);
    });
    text(widget, "text_backtips", reward.partial ? `战败 · 已保留 ${reward.defeatedCount} 只怪物收益\n点击返回关卡` : "点击返回关卡");
    click(widget, () => actions.returnToSelection());
    scene(widget, true);
    lastRender = () => result(outcome, reward, state, catalog);
    stage("result");
    const pet = reward.petGrowth;
    const petMessage = pet?.amount > 0 ? `主宠经验 +${pet.amount} · 宠物 Lv.${pet.level}` : "";
    const care = reward.petCare;
    const sideLevelUps = reward.sidePetGrowth?.filter((entry) => entry.level > entry.previousLevel).length || 0;
    const sideCare = reward.sidePetCare?.length || 0;
    const careMessage = care ? `主宠忠诚降至 ${care.loyalty}` : "";
    const notices = [];
    if (pet && pet.level > pet.previousLevel) notices.push(`主宠升至 ${pet.level} 级`);
    if (care) notices.push(`${careMessage}${[79, 59].includes(care.loyalty) ? "，属性加成降低" : ""}，可用宠物精魂喂养`);
    if (sideLevelUps) notices.push(`${sideLevelUps} 只副宠升级`);
    if (sideCare) notices.push(`${sideCare} 只副宠忠诚下降`);
    if (notices.length && document.getElementById("monsterSaveRetry").hidden) notice(notices.join(" · "));
    statusMessage(`${outcome === 3 ? "胜利" : `战败，已保留 ${reward.defeatedCount} 只怪物收益`} · 金币 +${reward.gold} · 经验 +${reward.experience} · 当前 Lv.${state.player.level}${petMessage ? ` · ${petMessage}` : ""}${careMessage ? ` · ${careMessage}` : ""}${sideLevelUps ? ` · ${sideLevelUps} 只副宠升级` : ""}${sideCare ? ` · ${sideCare} 只副宠忠诚下降` : ""}`);
  }
  function details(title, opener) {
    document.getElementById("monsterDetailsTitle").textContent = title;
    const content = document.getElementById("monsterDetailsContent");
    content.replaceChildren();
    content.className = "";
    const dialog = document.getElementById("monsterDetails");
    if (!dialog.open) {
      dialog.addEventListener("close", () => opener.focus(), { once: true });
      dialog.showModal();
    }
    return content;
  }
  function role(state, catalog) {
    renderRole(details(`角色属性 · Lv.${state.player.level}`, controls.Role), state, catalog, actions);
  }
  function bag(state, catalog, kind, receipt) { renderBag(details("背包", controls.Bag), state, catalog, actions, { kind, receipt }); }
  function bagItem(state, catalog, target, receipt) { renderBagItem({ content: details(target.kind === "equipment" ? "装备分解与锁定" : "道具出售", controls.Bag), state, catalog, target, actions, receipt }); }
  function pets(state, catalog, receipt) {
    const preserveIndex = receipt?.targetIndex ?? null;
    const dialog = document.getElementById("monsterDetails");
    const content = document.getElementById("monsterDetailsContent");
    if (preserveIndex !== null && (!dialog.open || !content.classList.contains("monster-pets-content"))) return;
    const card = preserveIndex === null ? null : content.querySelector(`[data-pet-care-index="${preserveIndex}"]`)?.closest(".monster-pet-card");
    const top = card?.getBoundingClientRect().top;
    const expanded = card?.querySelector("details")?.open;
    const focus = document.activeElement?.dataset;
    const focusSelector = focus?.mainPetIndex === String(preserveIndex) ? `[data-main-pet-index="${preserveIndex}"]`
      : focus?.sidePetIndex === String(preserveIndex) ? `[data-side-pet-index="${preserveIndex}"]`
      : focus?.petFeedIndex === String(preserveIndex) ? `[data-pet-feed-index="${preserveIndex}"]`
      : focus?.petFeedFullIndex === String(preserveIndex) ? `[data-pet-feed-full-index="${preserveIndex}"]` : null;
    renderPets({ content: details("宠物 · 主宠与副宠", controls.Bag), state, catalog, actions, receipt });
    const updated = preserveIndex === null ? null : content.querySelector(`[data-pet-care-index="${preserveIndex}"]`)?.closest(".monster-pet-card");
    if (expanded && updated) updated.querySelector("details").open = true;
    if (updated && top !== undefined) content.scrollTop += updated.getBoundingClientRect().top - top;
    if (focusSelector) {
      const next = content.querySelector(focusSelector);
      if (next && !next.disabled) next.focus({ preventScroll: true });
      else updated?.querySelector("summary")?.focus({ preventScroll: true });
    }
  }
  function skills(state, catalog) { renderSkills(details("技能", controls.Skills), state, catalog, actions); }
  function selectCopy(state, catalog, settings) {
    document.getElementById("monsterItemDetails").close();
    const content = details("选择关卡", controls.Adventure);
    renderCopySelection({ content, state, catalog, settings, onStart: (copyId, selected) => actions.startScoutedCopy(copyId, selected), onOffline: (copyId, selected) => actions.startOffline(copyId, selected), onScout: (copyId, selected) => actions.scoutCopy(copyId, selected), onClaim: () => actions.claimTrial() });
  }
  function offline(state, catalog, options) {
    offlineBusy = options.phase === "calculating";
    document.getElementById("monsterDetailsClose").disabled = offlineBusy;
    renderOffline({ content: details("离线挂机", controls.Enter), state, catalog, actions, ...options });
  }
  function offlineProgress(value) {
    const root = document.querySelector('[data-offline-phase="calculating"]');
    if (!root) return;
    const fraction = Math.max(0, Math.min(1, Number(value) || 0));
    const bar = root.querySelector("progress");
    const label = root.querySelector(".monster-offline-progress-label");
    const percent = Math.floor(fraction * 20) * 5;
    bar.value = fraction;
    if (label.dataset.percent !== String(percent)) { label.dataset.percent = String(percent); label.textContent = `正在计算 ${percent}%`; }
  }
  function closeOffline() { offlineBusy = false; document.getElementById("monsterDetailsClose").disabled = false; document.getElementById("monsterDetails").close(); }
  function resetOffline() { closeOffline(); }
  function copyScout(state, catalog, copy, scout, selected) {
    const dialog = document.getElementById("monsterItemDetails");
    const content = dialog.querySelector(".monster-item-information"); content.replaceChildren();
    renderCopyScout({ content, state, catalog, copy, scout, selected, actions });
    if (!dialog.open) dialog.showModal();
  }
  function closeCopyScout() { document.getElementById("monsterItemDetails").close(); }
  function closeSelection() { document.getElementById("monsterDetails").close(); }
  function trial(state, catalog) {
    const content = details("勇者试炼", controls.Adventure);
    renderTrial({ content, state, catalog, onStart(trialHard) {
      actions.scoutCopy(3101, { trialHard, repeat: false });
    }, onClaim: () => actions.claimTrial() });
  }
  function tasks(state, catalog, now) {
    renderTasks({ content: details("日常任务", controls.Enter), state, catalog, actions, now });
  }
  function shop(state, catalog, { itemId, preserve = false, receipt } = {}) {
    const content = document.getElementById("monsterDetailsContent");
    if (preserve && (!document.getElementById("monsterDetails").open || !content.classList.contains("monster-shop-content"))) return;
    if (!preserve) shopSelection = { index: itemId === undefined ? null : catalog.shop.findIndex((offer) => offer.type === 1 && offer.itemid === itemId) };
    const scrollTop = preserve ? content.scrollTop : 0;
    renderShop({ content: details("魔石商店", controls.Enter), state, catalog, actions, selection: shopSelection, receipt });
    content.scrollTop = scrollTop;
    if (preserve) {
      const target = receipt && !receipt.saved ? content.querySelector(".monster-shop-feedback button")
        : content.querySelector("[data-shop-purchase]:not(:disabled)");
      (target || content.querySelector(`[data-shop-offer="${shopSelection.index}"]`))?.focus({ preventScroll: true });
    }
  }
  function workshop(state, catalog) { renderWorkshop({ content: details("铁匠铺", controls.Role), state, catalog, actions }); }
  function upgrade(state, catalog, target, receipt) {
    upgradeScreen = { target: { ...target }, screen: renderUpgrade({ content: details("装备培养", controls.Role), state, catalog, target, actions, receipt }) };
  }
  function updateUpgrade(state, catalog, target, receipt, session) {
    if (!upgradeScreen || !upgradeScreen.screen.root.isConnected || !document.getElementById("monsterDetails").open) return;
    const current = upgradeScreen.target;
    if (current.source !== target.source || current.index !== target.index || current.id !== target.id) return;
    upgradeScreen.screen.update({ state, receipt, session });
  }
  function craft(state, catalog, receipt, preserveSelection = false) {
    if (preserveSelection && (!document.getElementById("monsterDetails").open || !document.querySelector("#monsterDetailsContent .monster-craft"))) return;
    if (!preserveSelection) craftSelection = { category: "equipment", itemId: null };
    const content = document.getElementById("monsterDetailsContent");
    const scrollTop = preserveSelection ? content.scrollTop : 0;
    const listScrollTop = preserveSelection ? content.querySelector(".monster-craft-list")?.scrollTop || 0 : 0;
    details("打造与合成", controls.Role).append(renderCraft({ state, catalog, actions, receipt, selection: craftSelection }));
    content.scrollTop = scrollTop;
    content.querySelector(".monster-craft-list").scrollTop = listScrollTop;
  }
  function materialSources(state, catalog, itemId, sources) {
    const dialog = document.getElementById("monsterItemDetails");
    const content = dialog.querySelector(".monster-item-information"); content.replaceChildren();
    renderMaterialSources({ content, state, catalog, itemId, sources, actions });
    if (!dialog.open) dialog.showModal();
  }
  function closeMaterialSources() { document.getElementById("monsterItemDetails").close(); }
  function smelt(state, catalog, receipt) { renderSmelt({ content: details("熔炼", controls.Role), state, catalog, actions, receipt }); }
  function specialUpgrade(state, catalog, target, receipt) { renderSpecialUpgrade({ content: details("徽章升级", controls.Role), state, catalog, target, actions, receipt }); }
  function godUpgrade(state, catalog, target, receipt) { renderGodUpgrade({ content: details("神器培养", controls.Role), state, catalog, target, actions, receipt }); }
  return {
    menu, home, updateHome, battle, battleUpdate, result, role, bag, bagItem, pets, skills, selectCopy, offline, offlineProgress, closeOffline, resetOffline, copyScout, closeCopyScout, closeSelection, trial, tasks, shop, workshop, upgrade, updateUpgrade, craft, materialSources, closeMaterialSources, smelt, specialUpgrade, godUpgrade, notice,
    repeatStatus(enabled) { repeating = enabled; document.getElementById("monsterStop").hidden = !enabled; stage(phase); },
    exitPending(enabled) { exitPending = enabled; stage(phase); },
    loadError(message) { stage("error"); statusMessage(message); },
    saveStatus(message, error = false, status = null) {
      saveErrorStatus = status;
      if (!error && message.startsWith("已保存")) document.getElementById("monsterToast")?.remove();
      document.getElementById("monsterCloudIndicator").textContent = error ? "!" : message.startsWith("正在") ? "…" : "✓";
      document.getElementById("monsterSaveStatus").textContent = message;
      document.querySelector(".monster-save-line").dataset.error = String(error);
      if (error && document.querySelector("dialog[open]")) notice(message);
      document.getElementById("monsterSaveRetry").hidden = !error;
      document.getElementById("monsterSaveRetry").textContent = status === 409 ? "重载云存档" : status === 401 ? "返回登录" : "重试保存";
    },
    bind(controller) {
      actions = controller;
      controls.Enter.onclick = enter;
      controls.Adventure.onclick = () => actions.selectCopy();
      document.getElementById("monsterStop").onclick = () => actions.stopRepeat();
      exitBattle.onclick = () => { exitBattle.disabled = true; actions.exitBattle(); };
      controls.Role.onclick = () => actions.role(); controls.Bag.onclick = () => actions.bag();
      controls.Skills.onclick = () => actions.skills();
      document.getElementById("monsterItemClose").onclick = () => document.getElementById("monsterItemDetails").close();
      document.getElementById("monsterSaveRetry").onclick = () => {
        if (saveErrorStatus === 409) location.reload();
        else if (saveErrorStatus === 401) location.href = "/";
        else actions.save();
      };
      document.getElementById("monsterNewCancel").onclick = () => document.getElementById("monsterNewGame").close();
      document.getElementById("monsterNewGame").addEventListener("close", () => controls.Enter.focus());
      document.getElementById("monsterNewGameForm").onsubmit = (event) => { event.preventDefault(); const name = document.getElementById("monsterName").value.trim(); if (!name) return; hasSave = true; document.getElementById("monsterNewGame").close(); actions.create(name); };
      document.getElementById("monsterDetailsClose").onclick = () => { if (!offlineBusy) document.getElementById("monsterDetails").close(); };
      document.getElementById("monsterDetails").addEventListener("cancel", (event) => { if (offlineBusy) event.preventDefault(); });
      document.getElementById("monsterDetails").addEventListener("close", () => actions.stopStrengthening());
    },
  };
}
