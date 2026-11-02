import type { Metadata } from "next"
import Link from "next/link"
import { TestStripLog } from "@/components/harm-reduction/test-strip-log"

export const metadata: Metadata = {
  title: "My test-strip log | NarcoGuard",
  description: "An optional, private log of fentanyl and xylazine test-strip results, kept only on your phone.",
}

export default function TestStripsPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">My test-strip log</h1>
        <p className="text-muted-foreground">Optional. A negative strip never means a drug is safe. How strips work and their limits: <Link className="text-primary underline" href="/safer-use">Stay safer</Link>.</p>
      </header>
      <TestStripLog />
      <p className="text-xs text-muted-foreground">General information, not medical advice. In an emergency, call 911.</p>
    </main>
  )
}
