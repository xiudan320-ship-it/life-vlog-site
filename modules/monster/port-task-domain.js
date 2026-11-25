// The port has no real-money recharge or black market. Preserve the task IDs,
// thresholds and rewards while connecting those goals to available activities.
export function adaptPortTasks(tasks) {
  return tasks.map((task) => {
    if (task.id === 1006) return { ...task, name: "在商店购买道具" };
    if (task.id === 1007) return { ...task, name: "完成一次战斗" };
    return task;
  });
}
