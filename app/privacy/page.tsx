export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">NarcoGuard Privacy</h1>
        <p className="text-sm text-muted-foreground text-center">Updated September 27, 2026</p>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Guardian Stability planner</h2>
            <p>
              The optional planner can store your needs check-ins, estimated sleep hours, goals, plans, ZIP code,
              and a support phone number in this browser. It is off until you enable it. Your entries are not
              uploaded to a NarcoGuard account or synced between devices by this planner.
            </p>
            <p>
              Anyone who can use this browser may be able to read your entries. They are not encrypted by the
              planner. Clearing your browser data can erase them. You can pause new entries or erase the planner
              data from its page; erasing the planner does not erase data held by external sites you visit.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Website analytics and outside services</h2>
            <p>
              This website includes Vercel Analytics for site-usage measurements. The planner does not send your
              check-in answers, goals, sleep entries, support phone number, or ZIP code as custom analytics events.
              Visiting the planner page may still count as a website page visit. Do not enter personal information
              into a shared browser if that would put you at risk.
            </p>
            <p>
              Resource links can open third-party websites or phone services. Those services have their own privacy
              practices. Check a service&apos;s details and availability before relying on it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Emergency and health limitations</h2>
            <p>
              The public app is a software and wearable research concept, not an emergency dispatch service or a
              validated medical device. The Guardian planner does not monitor your location or vitals, calculate
              relapse odds, contact loved ones, summon responders, or contact 911 for you. Its support-person link
              only opens your phone dialer when you choose to tap it. Call 911 yourself for an immediate emergency.
            </p>
            <p>
              No formal HIPAA compliance claim is made for the current planner, and its browser-local entries are
              not encrypted at rest by the planner. Any future health-data service or contact alerts would need separate consent,
              security, and legal review before launch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Questions</h2>
            <p>For privacy questions, contact <a className="underline" href="mailto:narcoguard607@gmail.com">narcoguard607@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
