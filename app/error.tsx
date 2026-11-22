"use client"

import { useEffect } from "react"
import { EmergencyFallback } from "@/components/common/emergency-fallback"
import { reloadOnceForChunkError } from "@/lib/chunk-reload"

// Route error boundary (#296): a crash on any page still shows Call 911 and the overdose steps.
// A stale-build chunk failure after a deployment reloads once into the current build.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (reloadOnceForChunkError(error)) return
    console.error(error)
  }, [error])
  return <EmergencyFallback title="Something went wrong" message="This page did not load. Help is still here." onRetry={reset} />
}
