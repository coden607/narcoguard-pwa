import type { Metadata } from "next"
import { CheckOnMeTimer } from "@/components/harm-reduction/check-on-me-timer"

export const metadata: Metadata = {
  title: "Check-on-me timer | NarcoGuard",
  description: "Set a timer. If you don't tap I'm okay in time, your phone sounds a loud alarm and shows anyone nearby how to help. Works offline.",
}

export default function CheckOnMePage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Check-on-me timer</h1>
        <p className="text-muted-foreground">For when you might use alone. Everything stays on this phone. Having someone with you, and naloxone in reach, is still safer.</p>
      </header>
      <CheckOnMeTimer />
      <p className="text-xs text-muted-foreground">General information, not medical advice. In an emergency, call 911.</p>
    </main>
  )
}
