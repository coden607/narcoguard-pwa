"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const UPDATE_INTERVAL_MS = 15 * 60 * 1000
const VERSION_STORAGE_KEY = "narcoguard_seen_deployment_version_v1"
const UPDATE_NOTICE_KEY = "narcoguard_update_notice_version_v1"
const UPDATE_READY_KEY = "narcoguard_update_ready_version_v1"

type VersionResponse = { version?: string }

export function ServiceWorkerRegister({ initialVersion = "local" }: { initialVersion?: string }) {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [loadedVersion, setLoadedVersion] = useState(initialVersion)
  const [online, setOnline] = useState<boolean | null>(null)
  const [checkStatus, setCheckStatus] = useState("")
  const dirtyRef = useRef(false)
  const checkRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let disposed = false
    let checking = false
    let registrationRef: ServiceWorkerRegistration | undefined
    let loaded = initialVersion !== "local" ? initialVersion : null
    try { loaded ||= window.localStorage.getItem(VERSION_STORAGE_KEY) } catch { /* Storage may be blocked. */ }
    const markDirty = (event: Event) => {
      const element = event.target
      if (element instanceof HTMLElement && (element.matches("input, textarea, select") || element.isContentEditable)) dirtyRef.current = true
    }
    document.addEventListener("input", markDirty, true)
    document.addEventListener("change", markDirty, true)
    const syncUpdateAcrossTabs = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== UPDATE_READY_KEY || !event.newValue) return
      if (event.newValue !== loaded && /^[a-zA-Z0-9._-]{1,128}$/.test(event.newValue)) {
        setUpdateVersion(event.newValue)
        setCheckStatus("Update ready")
      }
    }
    window.addEventListener("storage", syncUpdateAcrossTabs)
    // A tab that mounts after another tab already saw the update reads the persisted value.
    queueMicrotask(() => { try {
      if (disposed) return
      const persisted = window.localStorage.getItem(UPDATE_READY_KEY)
      if (persisted && loaded && persisted !== loaded && /^[a-zA-Z0-9._-]{1,128}$/.test(persisted)) {
        setUpdateVersion(persisted)
        setCheckStatus("Update ready")
      }
    } catch { /* Cross-tab sync is optional. */ } })

    const pushUpdateNotice = async (registration: ServiceWorkerRegistration, version: string) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return
      if (window.localStorage.getItem(UPDATE_NOTICE_KEY) === version) return

      window.localStorage.setItem(UPDATE_NOTICE_KEY, version)
      await registration.showNotification("NarcoGuard update available", {
        body: "A newer NarcoGuard version is ready. Open the app and reload to update.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "narcoguard-app-update",
        data: { url: "/?update=1" },
      })
    }

    const checkDeploymentVersion = async (registration?: ServiceWorkerRegistration) => {
      if (checking || disposed) return
      checking = true
      try {
        const response = await fetch("/api/app-version", { cache: "no-store" })
        if (!response.ok) throw new Error("Version check unavailable")
        const body = await response.json() as VersionResponse
        const version = body.version?.trim()
        if (!version || !/^[a-zA-Z0-9._-]{1,128}$/.test(version) || disposed) return
        loaded ||= version
        setLoadedVersion(loaded)
        try { window.localStorage.setItem(VERSION_STORAGE_KEY, loaded) } catch { /* Visible checks still work without storage. */ }
        setCheckStatus(loaded === version ? "Up to date" : "Update ready")
        if (loaded !== version) {
          setUpdateVersion(version)
          try { window.localStorage.setItem(UPDATE_READY_KEY, version) } catch { /* Cross-tab sync is optional. */ }
          if (registration) await pushUpdateNotice(registration, version)
        } else {
          setUpdateVersion(null)
          try { window.localStorage.removeItem(UPDATE_READY_KEY) } catch { /* Cross-tab sync is optional. */ }
        }
      } catch {
        if (!disposed) setCheckStatus("Could not check for updates. Try again when online.")
      } finally {
        checking = false
      }
    }

    checkRef.current = () => {
      if (registrationRef) void registrationRef.update().catch(() => undefined)
      void checkDeploymentVersion(registrationRef)
    }
    const connectivity = () => { setOnline(navigator.onLine); if (navigator.onLine) checkRef.current?.() }
    window.addEventListener("online", connectivity)
    window.addEventListener("offline", connectivity)
    const initialCheck = window.setTimeout(connectivity, 0)
    const timer = window.setInterval(() => checkRef.current?.(), UPDATE_INTERVAL_MS)

    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registration) => {
      if (disposed) return
      registrationRef = registration

      // Establish a deployment baseline only on first use. Subsequent launches
      // compare the last version this device actually loaded with current production.
      void checkDeploymentVersion(registration)

      // Check immediately on launch and periodically while the app stays open.
      void registration.update().catch(() => undefined)

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing
        if (!worker || !navigator.serviceWorker.controller) return
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            void checkDeploymentVersion(registration)
          }
        })
      })
    }).catch((error) => {
      console.warn("NarcoGuard service worker registration failed", error)
    })

    const onControllerChange = () => {
      if (registrationRef) void checkDeploymentVersion(registrationRef)
    }
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange)

    return () => {
      disposed = true
      checkRef.current = null
      window.clearTimeout(initialCheck)
      window.removeEventListener("online", connectivity)
      window.removeEventListener("offline", connectivity)
      document.removeEventListener("input", markDirty, true)
      document.removeEventListener("change", markDirty, true)
      window.removeEventListener("storage", syncUpdateAcrossTabs)
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange)
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [initialVersion])

  const reloadIntoUpdate = () => {
    if (dirtyRef.current && !window.confirm("You may have unsaved changes. Save your work first, or choose OK to reload anyway.")) return
    if (updateVersion) {
      try {
        window.localStorage.setItem(VERSION_STORAGE_KEY, updateVersion)
        window.localStorage.removeItem(UPDATE_NOTICE_KEY)
        window.localStorage.removeItem(UPDATE_READY_KEY)
      } catch { /* Reload remains user-controlled when storage is unavailable. */ }
    }
    window.location.reload()
  }

  return (
    <>
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 text-xs text-muted-foreground" data-testid="app-build-status">
      <span title={loadedVersion}>{`Build ${loadedVersion.slice(0, 12)}`}</span>
      <span role="status" data-testid="app-connectivity-status">{online === null ? "Checking connection" : online ? "Online" : "Offline — network actions need a connection. Unsent messages can be retried manually."}</span>
      <button type="button" className="min-h-11 underline underline-offset-4" onClick={() => checkRef.current?.()}>Check for updates</button>
      <span role="status">{checkStatus}</span>
    </div>
    {updateVersion && (
    <div
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-xl border border-primary/40 bg-background/95 p-4 shadow-2xl backdrop-blur"
      role="status"
      aria-live="polite"
      data-testid="pwa-update-notice"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">NarcoGuard update available</p>
          <p className="text-sm text-muted-foreground">
            {`Build ${updateVersion.slice(0, 12)} is ready. Save your work before reloading.`}
          </p>
        </div>
        <Button type="button" onClick={reloadIntoUpdate} className="shrink-0">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Update now
        </Button>
      </div>
    </div>
    )}
    </>
  )
}
