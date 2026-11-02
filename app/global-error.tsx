"use client"

import { EmergencyFallback } from "@/components/common/emergency-fallback"
import "./globals.css"

// Last-resort boundary (#296). It replaces the root layout, so it brings its own html and body.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <EmergencyFallback title="Something went wrong" message="The app did not load. Help is still here." onRetry={reset} />
      </body>
    </html>
  )
}
