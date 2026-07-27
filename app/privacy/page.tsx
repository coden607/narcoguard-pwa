export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">NarcoGuard Privacy Policy</h1>
        <p className="text-sm text-muted-foreground text-center">Last Updated: January 6, 2026</p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
            <h3 className="text-xl font-semibold mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Name and emergency contact information</li>
              <li>Phone numbers for SMS alerts</li>
              <li>Location data (GPS coordinates and address)</li>
              <li>Naloxone storage locations you specify</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Health Data (HIPAA-Protected)</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Heart rate, respiratory rate, SpO2 levels from NG Watch</li>
              <li>Overdose detection alerts and timestamps</li>
              <li>Naloxone administration records</li>
              <li>Recovery milestones and wellness tracking</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>App interactions and feature usage</li>
              <li>Training module completion</li>
              <li>Hero Network participation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Emergency Response:</strong> Share location and vitals with 911, emergency contacts, and nearby
                Heroes during overdose alerts
              </li>
              <li>
                <strong>Vitals Monitoring:</strong> Process sensor data through Kalman filtering to detect overdose
                events
              </li>
              <li>
                <strong>Never Use Alone:</strong> Trigger automatic check-ins and emergency protocols
              </li>
              <li>
                <strong>Hero Network:</strong> Connect nearby trained responders to emergencies
              </li>
              <li>
                <strong>Guardian Aingel:</strong> Provide personalized recovery insights and recommendations
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Data Sharing</h2>
            <p className="text-muted-foreground mb-3">We share your data ONLY in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Emergency Situations:</strong> With 911 dispatchers, paramedics, and your emergency contacts
              </li>
              <li>
                <strong>Hero Network:</strong> Location and basic emergency info with nearby trained Heroes
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to prevent imminent harm
              </li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We DO NOT sell your data to third parties or share it for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. HIPAA Compliance</h2>
            <p className="text-muted-foreground">
              NarcoGuard handles Protected Health Information (PHI) in compliance with HIPAA regulations. Your health
              data is encrypted in transit and at rest. By using the App, you authorize us to share your PHI with
              emergency responders when necessary to save your life.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as you use the App. You can request data deletion at any time by
              contacting support@narcoguard.app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Your Privacy Rights</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access your data at any time through the App</li>
              <li>Request data correction or deletion</li>
              <li>Opt out of non-emergency data collection</li>
              <li>Use incognito mode to limit data sharing with Hero Network</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Security</h2>
            <p className="text-muted-foreground">
              We use industry-standard encryption and security measures to protect your data. However, no system is 100%
              secure. You use the App at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy questions or to exercise your rights, contact: privacy@narcoguard.app
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
