import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { OVERDOSE_STEPS } from "@/components/emergency/overdose-steps"

export const metadata: Metadata = {
  title: "Help someone who may be overdosing | NarcoGuard",
  description: "Large, simple overdose steps to show or hand to a bystander, with a QR code to open them on their own phone.",
}

// A screen to hand to someone nearby. The steps come from the same list as the emergency modal.
// The QR code is a static file encoding https://www.narcoguard.app/bystander, so it works offline
// and needs no library at run time.
export default function BystanderPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <h1 className="text-4xl font-black">Someone may be overdosing. Here&apos;s how to help.</h1>
      <a href="tel:911" className="block rounded-2xl bg-red-600 px-6 py-5 text-center text-3xl font-black text-white" data-testid="bystander-911">Call 911</a>
      <ol className="list-decimal space-y-4 pl-7 text-2xl font-semibold leading-snug" data-testid="bystander-steps">
        {OVERDOSE_STEPS.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <Link href="/ar" className="block rounded-2xl border-2 border-primary px-6 py-4 text-center text-xl font-bold">Show me each step</Link>
      <section aria-labelledby="qr" className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center text-black">
        <h2 id="qr" className="text-xl font-bold">Open these steps on your own phone</h2>
        <Image src="/bystander-qr.svg" alt="QR code linking to narcoguard.app/bystander" width={220} height={220} unoptimized priority />
        <p className="text-sm">Point your camera here. Or go to narcoguard.app/bystander</p>
      </section>
      <p className="text-xs text-muted-foreground">General information, not medical advice. In an emergency, call 911. Sources: CDC and SAMHSA naloxone guidance, as reviewed for the emergency screen.</p>
    </main>
  )
}
