import { escapeHtml } from "./ui-formatters.js";

const WHEEL_COLORS = ["#55d6b5", "#ff806d", "#8798f2", "#f0c85f", "#e8f2ed", "#bd9ee8"];

export function normalizeFoodOptions(values) {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim().slice(0, 24))
        .filter(Boolean)
    ),
  ].slice(0, 14);
}

export function buildFoodWheelOptions(foodOptions = [], recipes = []) {
  return [
    ...new Set([...foodOptions, ...recipes.map((recipe) => recipe.name)].filter(Boolean)),
  ].slice(0, 14);
}

function drawFoodWheel(canvas, options) {
  const context = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 18;
  context.clearRect(0, 0, size, size);

  const segment = (Math.PI * 2) / options.length;
  options.forEach((option, index) => {
    const start = -Math.PI / 2 + index * segment;
    const end = start + segment;
    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, start, end);
    context.closePath();
    context.fillStyle = WHEEL_COLORS[index % WHEEL_COLORS.length];
    context.fill();
    context.strokeStyle = "#151816";
    context.lineWidth = 5;
    context.stroke();

    context.save();
    context.translate(center, center);
    context.rotate(start + segment / 2);
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillStyle = "#111512";
    context.font = `800 ${options.length > 10 ? 22 : 27}px "Microsoft YaHei", sans-serif`;
    const label = option.length > 7 ? `${option.slice(0, 7)}…` : option;
    context.fillText(label, radius - 30, 0);
    context.restore();
  });

  context.beginPath();
  context.arc(center, center, 62, 0, Math.PI * 2);
  context.fillStyle = "#151816";
  context.fill();
  context.strokeStyle = "#f2f4ef";
  context.lineWidth = 9;
  context.stroke();
}

export function renderFoodWheelView({ canvas, optionsElement, options = [], onRemove }) {
  if (!canvas) return;
  drawFoodWheel(canvas, options);
  if (!optionsElement) return;
  optionsElement.innerHTML = options
    .map(
      (option) => `
        <button type="button" data-remove-food="${escapeHtml(option)}" title="从转盘移除">
          ${escapeHtml(option)}<span>×</span>
        </button>
      `
    )
    .join("");
  optionsElement.querySelectorAll("[data-remove-food]").forEach((button) => {
    button.addEventListener("click", () => onRemove(button.dataset.removeFood));
  });
}
