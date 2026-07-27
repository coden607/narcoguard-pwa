export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">NarcoGuard Terms of Service</h1>
        <p className="text-sm text-muted-foreground text-center">Last Updated: January 6, 2026</p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using NarcoGuard ("the App"), you agree to be bound by these Terms of Service. If you do
              not agree to these terms, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Medical Disclaimer</h2>
            <p className="text-muted-foreground mb-3">
              NarcoGuard is a harm reduction tool and does NOT replace professional medical care. The App:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Does not provide medical advice, diagnosis, or treatment</li>
              <li>Cannot guarantee overdose prevention or detection</li>
              <li>Should not be relied upon as a substitute for emergency medical services</li>
              <li>Requires users to call 911 in all medical emergencies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. NG Watch Auto-Injection System</h2>
            <p className="text-muted-foreground mb-3">The NarcoGuard 2 Watch with auto-injection technology:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Is designed to administer naloxone automatically when an overdose is detected</li>
              <li>May produce false positives or false negatives - it is not 100% accurate</li>
              <li>Requires proper maintenance, charging, and cartridge replacement</li>
              <li>Should be used in conjunction with Never Use Alone protocols</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. User Responsibilities</h2>
            <p className="text-muted-foreground mb-3">Users agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide accurate emergency contact information</li>
              <li>Keep the App updated with current naloxone locations</li>
              <li>Allow location services for emergency response</li>
              <li>Not use the App for illegal activities</li>
              <li>Complete proper training before administering naloxone to others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Hero Network</h2>
            <p className="text-muted-foreground mb-3">
              Heroes who respond to emergencies through the App agree to act within Good Samaritan law protections and
              follow proper naloxone administration protocols.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Data Collection & Privacy</h2>
            <p className="text-muted-foreground">
              We collect location data, vitals data, and emergency information to provide life-saving services. See our
              Privacy Policy for details on data handling.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Broome Estates LLC and NarcoGuard creators are not liable for any injuries, damages, or deaths resulting
              from App use or malfunction. This is a harm reduction tool provided "as-is" without warranties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground">For questions about these Terms, contact: support@narcoguard.app</p>
          </section>
        </div>
      </div>
    </div>
  )
}
