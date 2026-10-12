"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const UPDATE_INTERVAL_MS = 15 * 60 * 1000
const VERSION_STORAGE_KEY = "narcoguard_seen_deployment_version_v1"
const UPDATE_NOTICE_KEY = "narcoguard_update_notice_version_v1"

type VersionResponse = { version?: string }

export function ServiceWorkerRegister() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let timer: number | undefined
    let disposed = false
    let registrationRef: ServiceWorkerRegistration | undefined

    const pushUpdateNotice = async (registration: ServiceWorkerRegistration, version: string) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return
      if (window.localStorage.getItem(UPDATE_NOTICE_KEY) === version) return

      window.localStorage.setItem(UPDATE_NOTICE_KEY, version)
      await registration.showNotification("NarcoGuard update available", {
        body: "A newer NarcoGuard version is ready. Open the app and reload to update.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "narcoguard-app-update",
        renotify: true,
        data: { url: "/?update=1" },
      })
    }

    const checkDeploymentVersion = async (registration: ServiceWorkerRegistration, establishBaseline = false) => {
      try {
        const response = await fetch("/api/app-version", { cache: "no-store" })
        if (!response.ok) return
        const body = await response.json() as VersionResponse
        const version = body.version?.trim()
        if (!version || version === "local") return

        const seen = window.localStorage.getItem(VERSION_STORAGE_KEY)
        if (!seen || establishBaseline) {
          window.localStorage.setItem(VERSION_STORAGE_KEY, version)
          return
        }

        if (seen !== version) {
          setUpdateVersion(version)
          await pushUpdateNotice(registration, version)
        }
      } catch {
        // Update checks are best-effort and must never block the app.
      }
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
      if (disposed) return
      registrationRef = registration

      // Establish a deployment baseline on first use. Subsequent checks compare
      // the last version this device actually loaded with the current deployment.
      void checkDeploymentVersion(registration, true)

      // Check immediately on launch and periodically while the app stays open.
      void registration.update().catch(() => undefined)
      timer = window.setInterval(() => {
        void registration.update().catch(() => undefined)
        void checkDeploymentVersion(registration)
      }, UPDATE_INTERVAL_MS)

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
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    return () => {
      disposed = true
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [])

  const reloadIntoUpdate = () => {
    if (updateVersion) {
      window.localStorage.setItem(VERSION_STORAGE_KEY, updateVersion)
      window.localStorage.removeItem(UPDATE_NOTICE_KEY)
    }
    window.location.reload()
  }

  if (!updateVersion) return null

  return (
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
            This device is running an older app version. Reload to use the latest NarcoGuard updates.
          </p>
        </div>
        <Button type="button" onClick={reloadIntoUpdate} className="shrink-0">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Update now
        </Button>
      </div>
    </div>
  )
}
