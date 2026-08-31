const boundNotificationButtons = new WeakSet();

export function bindNotificationEvents({ elements, openNotificationsPanel, closeNotificationsPanel }) {
  const notificationButton = elements.notificationButton;
  if (!notificationButton || boundNotificationButtons.has(notificationButton)) return;
  boundNotificationButtons.add(notificationButton);

  notificationButton.addEventListener("click", () => {
    void Promise.resolve(openNotificationsPanel()).catch(() => undefined);
  });
  elements.closeNotificationDialog?.addEventListener("click", closeNotificationsPanel);
  elements.notificationDialog?.addEventListener("click", (event) => {
    if (event.target === elements.notificationDialog) closeNotificationsPanel();
  });
  elements.notificationDialog?.addEventListener("close", () => {
    if (!notificationButton.hidden) notificationButton.focus({ preventScroll: true });
  });
}
