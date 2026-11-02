import type { Metadata } from "next"
import { EmergencyFallback } from "@/components/common/emergency-fallback"

export const metadata: Metadata = { title: "Page not found | NarcoGuard" }

// A bad link never strands someone (#296).
export default function NotFound() {
  return <EmergencyFallback title="Page not found" message="We could not find that page. Help is still here." />
}
