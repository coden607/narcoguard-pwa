import type { Metadata } from "next"
import Link from "next/link"
import { MASLOW_LEVELS as LEVELS } from "@/lib/maslow-levels"

export const metadata: Metadata = {
  title: "About | NarcoGuard",
  description: "How NarcoGuard uses Maslow's hierarchy of needs to put basic needs first and help each person work toward their own goals.",
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3 text-center">
          <h1 className="text-4xl font-bold">About NarcoGuard</h1>
          <p className="text-muted-foreground">
            NarcoGuard is a public app and wearable research concept for overdose prevention and person-led recovery support. It starts
            with what a person needs today, and then helps with what they want for tomorrow.
          </p>
        </header>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section className="space-y-3" aria-labelledby="maslow">
            <h2 id="maslow" className="text-2xl font-semibold text-foreground">Built around Maslow&apos;s hierarchy of needs</h2>
            <p>
              Psychologist Abraham Maslow described human needs as layers: the body&apos;s needs first, then safety, then connection, then
              self-respect and independence, and then growth toward the goals that matter to you. It is hard to plan a job interview
              while hungry or without a safe place to sleep. So NarcoGuard lists basic needs first and builds up from there.
            </p>
            <p>
              The order is a planning aid, not a ranking of people or a test. Every kind of help stays visible at every level. You can
              start anywhere, skip any step, or work on several at once.
            </p>
          </section>

          <section className="space-y-4" aria-labelledby="levels">
            <h2 id="levels" className="text-2xl font-semibold text-foreground">Where each level lives in the app</h2>
            <ol className="space-y-4" data-testid="maslow-levels">
              {LEVELS.map((level) => (
                <li key={level.id} className="rounded-lg border border-border p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{level.title}</h3>
                  <p>{level.covers}</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {level.links.map((link) => (
                      <li key={link.href + link.label}>
                        <Link href={link.href} className="text-primary underline underline-offset-4">{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3" aria-labelledby="how">
            <h2 id="how" className="text-2xl font-semibold text-foreground">How it works for you</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Say what you need in your own words.</strong> Type something like &quot;I&apos;m
                hungry and need somewhere to sleep&quot; on Find Help. Find Help matches your words on your device; they go to the AI only
                if you tap &quot;Let AI read my words&quot;. Angel is different: once you agree to start a chat, each message you send goes
                to the AI provider so it can answer. Conversations are not stored.
              </li>
              <li>
                <strong className="text-foreground">See your needs first.</strong> The needs you name are shown first, with basic
                needs leading when you name several. Every other kind of help follows in the same order: basic needs, health and
                safety, recovery and connection, then growth. If no food, shelter or showers are close, those three are searched farther
                out and labelled with the distance.
              </li>
              <li>
                <strong className="text-foreground">Choose a goal.</strong> Angel listens to what you want and helps break it into small,
                concrete next steps. The Guardian planner can hold tomorrow&apos;s task.
              </li>
              <li>
                <strong className="text-foreground">Move up at your own pace.</strong> As today&apos;s needs are handled, the same tools
                help with work, learning, connection and the goals you set.
              </li>
            </ol>
          </section>

          <section className="space-y-3" aria-labelledby="you-lead">
            <h2 id="you-lead" className="text-2xl font-semibold text-foreground">You lead; the AI listens</h2>
            <p>
              Angel AI is there to listen and suggest, never to decide for you. You set the goals and choose every action. Suggestions
              come with reasons, and you can ignore any of them. Help never depends on tracking, an account or answering check-ins, and
              you can pause or erase your planner at any time.
            </p>
          </section>

          <section className="space-y-3" aria-labelledby="limits">
            <h2 id="limits" className="text-2xl font-semibold text-foreground">What NarcoGuard cannot promise</h2>
            <p>
              NarcoGuard cannot guarantee that a need will be met. Listings come from public directories and may be out of date, so call
              first. NarcoGuard cannot promise a bed, a meal, an appointment or a benefit. If nothing fits, dial 211 for local help. The
              app is not a medical device or emergency service and does not predict relapse.
            </p>
            <p className="font-medium text-foreground">
              If someone may be overdosing, call 911 now and give naloxone if you have it. For a crisis, call or text 988.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
