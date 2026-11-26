import "./home.css";
import { element, picture } from "./visual-ui.js";
import { getPlayerExperienceRequired, getParagonExperienceRequired } from "./progression-domain.js";
import { referencePower } from "./copy-scout-domain.js";

export function createMonsterHomeView(root, actions) {
  const card = element("section", undefined, "monster-home-character monster-original-panel");
  const identity = element("div", undefined, "monster-home-identity");
  const portrait = element("img", undefined, "monster-home-portrait");
  portrait.alt = "";
  const name = element("h1");
  const level = element("p", undefined, "monster-home-level");
  const power = element("p", undefined, "monster-home-power");
  const text = element("div", undefined, "monster-home-profile");
  text.append(name, level, power); identity.append(portrait, text);
  const wallet = element("dl", undefined, "monster-home-wallet");
  const [gold, money] = ["金币", "魔石"].map((label) => {
    const line = element("div");
    const value = element("dd");
    line.append(element("dt", label), value); wallet.append(line); return value;
  });
  const experience = element("progress");
  experience.setAttribute("aria-label", "角色经验进度");
  const experienceLabel = element("p", undefined, "monster-home-experience");
  card.append(identity, wallet, experienceLabel, experience);

  const groups = [
    ["冒险", [
      ["map", "地图", "ui/btn/img_level.png", () => actions.selectCopy(1)],
      ["copy", "副本", "ui/btn/main_btn_copy.png", () => actions.selectCopy(2)],
      ["abyss", "深渊", "ui/btn/main_btn_abyss.png", () => actions.selectCopy(5)],
      ["trial", "试炼", "ui/btn/btn_plan.png", () => actions.selectCopy(6)],
      ["boss", "首领与遭遇", "ui/btn/main_btn_god.png", () => actions.selectCopy(3)],
    ]],
    ["养成与事务", [
      ["task", "任务", "icon/item/5009.png", () => actions.tasks()],
      ["blacksmith", "铁匠铺", "ui/btn/img_blacksmith.png", () => actions.workshop()],
      ["pet", "宠物", "pet/1.png", () => actions.pets()],
      ["achievement", "成就", "ui/btn/main_btn_achieve.png", () => actions.achievements()],
      ["shop", "魔石商店", "ui/btn/img_shop.png", () => actions.shop()],
    ]],
  ];
  let petHint;
  root.append(card);
  for (const [title, shortcuts] of groups) {
    const section = element("section", undefined, "monster-home-section");
    const grid = element("div", undefined, "monster-home-shortcuts");
    section.append(element("h2", title), grid);
    for (const [id, label, icon, open] of shortcuts) {
      const button = element("button", undefined, "monster-home-shortcut");
      button.type = "button"; button.dataset.homeAction = id;
      button.onclick = () => { button.focus({ preventScroll: true }); open(); };
      button.append(picture(icon), element("span", label));
      if (id === "pet") { petHint = element("small", "35 级开放"); button.append(petHint); }
      grid.append(button);
    }
    root.append(section);
  }
  const number = (value) => value.toLocaleString("zh-CN");
  return {
    update(state) {
      const { player } = state;
      portrait.src = "/monster/assets/" + player.image;
      name.textContent = player.name;
      level.textContent = "等级 " + player.level;
      power.textContent = "参考战力 " + number(referencePower(player));
      gold.textContent = number(state.gold); money.textContent = number(state.money);
      const paragon = player.level >= 80;
      experience.max = paragon ? getParagonExperienceRequired(player.paragon) : getPlayerExperienceRequired(player.level);
      experience.value = player.experience;
      experienceLabel.textContent = (paragon ? "巅峰 " + player.paragon + " · " : "") + "经验 " + number(player.experience) + " / " + number(experience.max);
      experience.setAttribute("aria-valuetext", experienceLabel.textContent);
      petHint.hidden = player.level >= 35;
    },
  };
}
