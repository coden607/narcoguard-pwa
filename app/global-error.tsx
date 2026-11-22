"use client"

import { useEffect } from "react"
import { EmergencyFallback } from "@/components/common/emergency-fallback"
import { reloadOnceForChunkError } from "@/lib/chunk-reload"
import "./globals.css"

// Last-resort boundary (#296). It replaces the root layout, so it brings its own html and body.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // A stale-build chunk failure after a deployment reloads once into the current build.
  useEffect(() => { reloadOnceForChunkError(error) }, [error])
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <EmergencyFallback title="Something went wrong" message="The app did not load. Help is still here." onRetry={reset} />
      </body>
    </html>
  )
}
