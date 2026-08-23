import {
  buildFoodWheelOptions,
  normalizeFoodOptions,
  renderFoodWheelView,
} from "./food-wheel-view.js";

export function createFoodWheelController({
  elements,
  storageKey,
  defaultOptions,
  repository,
  getSession,
  getRecipes,
  getOptions,
  setOptions,
  canPersist,
  closeMobileDiaryPage,
  closePhotoDialog,
}) {
  let rotation = 0;
  let spinning = false;

  function getStorageKey(userId = getSession()?.user?.id || "guest") {
    return `${storageKey}:${userId}`;
  }

  function loadOptions(userId = getSession()?.user?.id || "guest") {
    try {
      const stored =
        localStorage.getItem(getStorageKey(userId)) ||
        localStorage.getItem(storageKey) ||
        "[]";
      const parsed = normalizeFoodOptions(JSON.parse(stored));
      return parsed.length ? parsed : [...defaultOptions];
    } catch {
      return [...defaultOptions];
    }
  }

  function saveOptionsCache(userId = getSession()?.user?.id || "guest") {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(getOptions()));
  }

  async function persistOptions(nextOptions) {
    const session = getSession();
    if (!session || !canPersist()) {
      elements.foodWheelResult.textContent =
        "Cloudflare D1 尚未升级，候选没有保存。请先部署最新版数据库结构。";
      return false;
    }

    const normalized = normalizeFoodOptions(nextOptions);
    const { data, error } = await repository.update(
      "user_profiles",
      {
        food_options: normalized,
        updated_at: new Date().toISOString(),
      },
      { user_id: session.user.id },
      { select: "food_options", single: true }
    );
    if (error) {
      elements.foodWheelResult.textContent = `候选同步失败：${error.message}`;
      return false;
    }

    const saved = normalizeFoodOptions(data.food_options);
    setOptions(saved);
    saveOptionsCache(session.user.id);
    return true;
  }

  function getWheelOptions() {
    return buildFoodWheelOptions(getOptions(), getRecipes());
  }

  function render() {
    renderFoodWheelView({
      canvas: elements.foodWheel,
      optionsElement: elements.foodOptions,
      options: getWheelOptions(),
      onRemove: removeOption,
    });
  }

  async function addOption() {
    const value = elements.foodOptionInput.value.trim();
    if (!value) return;
    if (getOptions().includes(value)) {
      elements.foodOptionInput.value = "";
      return;
    }
    const saved = await persistOptions([...getOptions(), value]);
    if (!saved) return;
    elements.foodOptionInput.value = "";
    render();
  }

  async function removeOption(value) {
    const recipeNames = new Set(getRecipes().map((recipe) => recipe.name));
    if (recipeNames.has(value)) {
      elements.foodWheelResult.textContent = "菜谱里的菜会自动保留在转盘中";
      return;
    }
    if (getWheelOptions().length <= 2) {
      elements.foodWheelResult.textContent = "至少保留两个候选";
      return;
    }
    const saved = await persistOptions(
      getOptions().filter((item) => item !== value)
    );
    if (!saved) return;
    render();
  }

  function spin() {
    if (spinning) return;
    const options = getWheelOptions();
    if (options.length < 2) return;
    spinning = true;
    elements.spinFoodWheel.disabled = true;
    elements.spinFoodWheel.textContent = "转动中";
    elements.foodWheelResult.textContent = "转盘正在认真思考…";

    const winnerIndex = Math.floor(Math.random() * options.length);
    const segmentDegrees = 360 / options.length;
    const desiredMod =
      (360 - (winnerIndex * segmentDegrees + segmentDegrees / 2)) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    rotation += ((desiredMod - currentMod + 360) % 360) + 360 * 6;
    elements.foodWheel.style.transform = `rotate(${rotation}deg)`;

    window.setTimeout(() => {
      spinning = false;
      elements.spinFoodWheel.disabled = false;
      elements.spinFoodWheel.textContent = "开始转";
      const result = options[winnerIndex];
      elements.foodWheelResult.textContent = `今天就吃：${result}`;
      elements.foodWheelPeek.textContent = `今天吃 ${result}`;
    }, 4300);
  }

  function open() {
    elements.foodWheelSection.hidden = false;
    closeMobileDiaryPage();
    if (elements.dialog?.open) closePhotoDialog();
    if (elements.foodWheelDialog.open) return;
    render();
    elements.foodWheelDialog.showModal();
  }

  function close() {
    if (elements.foodWheelDialog.open) elements.foodWheelDialog.close();
  }

  return {
    addOption,
    close,
    getStorageKey,
    getWheelOptions,
    loadOptions,
    open,
    persistOptions,
    removeOption,
    render,
    saveOptionsCache,
    spin,
  };
}
