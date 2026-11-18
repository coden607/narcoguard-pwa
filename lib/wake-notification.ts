const TITLE = "NarcoGuard reminder"
const OPTIONS: NotificationOptions = { body: "Your chosen wake time is here. Open Daily Life for your morning brief.", tag: "narcoguard-wake", icon: "/icon-192.png", data: { url: "/daily-life" } }

interface NotificationPort {
  permission: NotificationPermission
  registration: () => Promise<Pick<ServiceWorkerRegistration, "showNotification"> | undefined>
  create: () => void
}

/** Mobile installed PWAs need showNotification; the desktop constructor may throw. */
export async function showWakeNotification(port: NotificationPort): Promise<boolean> {
  if (port.permission !== "granted") return false
  try {
    const registration = await port.registration()
    if (registration) {
      await registration.showNotification(TITLE, OPTIONS)
      return true
    }
  } catch {
    // A desktop browser may still support its foreground constructor.
  }
  try {
    port.create()
    return true
  } catch {
    return false
  }
}

export function notifyWakeTime(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return Promise.resolve(false)
  return showWakeNotification({
    permission: Notification.permission,
    registration: () => "serviceWorker" in navigator ? navigator.serviceWorker.getRegistration() : Promise.resolve(undefined),
    create: () => { new Notification(TITLE, OPTIONS) },
  })
}
