type DeviceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

const unavailable = () => { throw new Error("Browser storage is unavailable") }
const BLOCKED_STORAGE: DeviceStorage = { getItem: unavailable, setItem: unavailable, removeItem: unavailable }

/** Accessing the storage property can itself throw, before a reader can handle it. */
export function browserStorage(): DeviceStorage {
  try {
    return window.localStorage
  } catch {
    return BLOCKED_STORAGE
  }
}

/** UI boundary only: shared storage writers still throw for transactional callers. */
export function tryStorageWrite(write: () => void): boolean {
  try { write(); return true } catch { return false }
}
