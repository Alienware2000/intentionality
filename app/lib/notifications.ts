// =============================================================================
// BROWSER NOTIFICATION WRAPPER
// Wraps the Notification API for focus timer alerts.
// =============================================================================

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("denied" as NotificationPermission);
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Promise.resolve(Notification.permission);
  }
  return Notification.requestPermission();
}

export function sendFocusNotification(title: string, body: string) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }
  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag: "focus-timer", // replaces previous focus notification
    });
  } catch {
    // Silent fail — some environments block Notification constructor
  }
}
