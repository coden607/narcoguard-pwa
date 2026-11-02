// Screen Wake Lock helpers (issue #263). Keeps the phone from dimming or locking while emergency
// or step-by-step screens are open. Unsupported browsers and refused requests are a quiet no-op:
// nothing on screen depends on the lock, and no error is ever shown to someone mid-emergency.

export interface WakeLockSentinelLike {
  released: boolean
  release(): Promise<void>
}

export interface WakeLockNavigator {
  wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> }
}

export function wakeLockSupported(nav: WakeLockNavigator | undefined): boolean {
  return typeof nav?.wakeLock?.request === "function"
}

/** Ask for a screen wake lock. Returns null when unsupported, hidden, or refused. */
export async function requestScreenWakeLock(nav: WakeLockNavigator | undefined): Promise<WakeLockSentinelLike | null> {
  if (!wakeLockSupported(nav)) return null
  try {
    return await nav!.wakeLock!.request("screen")
  } catch {
    return null
  }
}

export async function releaseScreenWakeLock(sentinel: WakeLockSentinelLike | null): Promise<void> {
  if (!sentinel || sentinel.released) return
  try {
    await sentinel.release()
  } catch {
    // Already released by the browser (tab hidden); nothing to do.
  }
}
