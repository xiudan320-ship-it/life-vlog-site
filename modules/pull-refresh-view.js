export function createPullRefreshView() {
  const element = document.createElement("div");
  element.id = "pullRefreshIndicator";
  element.className = "pull-refresh-indicator";
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");
  element.innerHTML = '<i aria-hidden="true"></i><span></span>';
  document.body.append(element);
  return {
    show(status, distance = 64) {
      element.className = `pull-refresh-indicator visible ${status}`;
      element.style.setProperty("--pull-y", `${distance}px`);
      element.style.setProperty("--pull-angle", `${distance * 4}deg`);
      element.querySelector("span").textContent = {
        pulling: "下拉刷新", ready: "松开刷新", refreshing: "正在刷新",
        success: "已更新", error: "刷新失败，请重试",
      }[status];
    },
    hide() {
      element.className = "pull-refresh-indicator";
      element.style.removeProperty("--pull-y");
      element.querySelector("span").textContent = "";
    },
  };
}
