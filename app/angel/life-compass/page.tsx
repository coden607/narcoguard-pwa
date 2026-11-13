import type { Metadata } from "next"
import Link from "next/link"
import { AngelAI } from "@/components/ai/angel-ai"

export const metadata: Metadata = {
  title: "Life Compass decision support | Angel AI | NarcoGuard",
  description: "Opt-in psychological reflection, evidence-aware decisions and scenario planning within Angel AI. Not a clinical service.",
}

export default function LifeCompassPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <Link href="/angel" className="text-sm underline">Back to Angel AI and nearby help</Link>
        <h1 className="text-3xl font-bold">Life Compass</h1>
        <p className="text-muted-foreground">
          A decision-support mode of Angel AI. Explore what happened, what remains uncertain,
          alternative explanations, and possible next steps. You remain in control.
        </p>
      </header>
      <AngelAI mode="life-compass" />
    </main>
  )
}
