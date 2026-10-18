import type { Metadata } from "next"
import Link from "next/link"
import { MeetingFinder } from "@/components/resources/meeting-finder"

export const metadata: Metadata = { title: "Recovery meetings | NarcoGuard", description: "Find primary-source recovery meeting directories and keep optional local meeting details with timezone and source information." }

export default function MeetingsPage() {
  return <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6"><Link href="/help" className="inline-flex min-h-11 items-center underline text-primary">Find other help</Link><h1 className="text-3xl font-bold">Recovery meetings</h1><MeetingFinder /></main>
}
