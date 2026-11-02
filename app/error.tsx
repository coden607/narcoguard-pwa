"use client"

import { useEffect } from "react"
import { EmergencyFallback } from "@/components/common/emergency-fallback"

// Route error boundary (#296): a crash on any page still shows Call 911 and the overdose steps.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return <EmergencyFallback title="Something went wrong" message="This page did not load. Help is still here." onRetry={reset} />
}
