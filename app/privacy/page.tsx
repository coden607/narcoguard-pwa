export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">NarcoGuard Privacy</h1>
        <p className="text-sm text-muted-foreground text-center">Updated October 22, 2026</p>

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
            <h2 className="text-2xl font-semibold text-foreground">Angel AI, nearby search and Bluetooth readings</h2>
            <p>
              Angel AI is off until you agree to start a chat. Your messages, and a ZIP code if you enter one, are sent to an AI
              model to write replies. Which one depends on how this site is set up: through Vercel AI Gateway to Anthropic&apos;s
              Claude, for which NarcoGuard requires zero data retention (the provider keeps no copy); or to an open model run by Groq,
              directly, through Vercel AI Gateway, or through OpenRouter limited to providers that do not store or train on prompts.
              Groq states that it does not use API inputs or outputs for training. When this site is set up to use Kimi, your
              messages go first to Moonshot AI, a company based in China; NarcoGuard has not confirmed whether Moonshot AI keeps or
              trains on API messages, and the chat screen says so before you start. If Kimi is unavailable, messages go to the
              gateway options above instead. NarcoGuard does not save the conversation; it is
              cleared when you leave the page. To read replies aloud, NarcoGuard picks a voice that runs on your device and never
              chooses an online voice; if your device has none, your browser&apos;s default voice is used.
            </p>
            <p>
              &quot;Find help near me&quot; and Angel use your location only when you tap &quot;Use my location&quot; or say
              &quot;use my location&quot;, or the ZIP code you give. The location is rounded to about one kilometer and sent to
              SAMHSA&apos;s FindTreatment.gov or OpenStreetMap services to get listings. Angel&apos;s AI provider never receives
              your location, only the names, distances and phone numbers of the places found. We do not store or log the
              location on our servers. So you only enter it once, your phone remembers the ZIP or the rounded location in its own
              storage; tap &quot;Forget where I am&quot;, or untick &quot;Remember … on this phone&quot; in Angel, to erase it.
            </p>
            <p>
              When fresh web discovery is configured and you search by ZIP code, NarcoGuard can also send Brave Search a generic
              list of resource categories together with that 5-digit ZIP. Your typed need description and GPS coordinates are not
              sent to Brave. Brave&apos;s current API privacy notice says API query records may be retained for up to 90 days for
              billing and troubleshooting. Brave&apos;s public result titles, URLs and snippets may then be sent to Groq only to
              categorize and rank those supplied results; NarcoGuard does not ask Groq to invent provider facts or send your
              NarcoGuard chat, account, health-record or Guardian data in that ranking request. Groq states that API inputs and
              outputs are not used for model training unless the customer explicitly permits it, and Zero Data Retention can be
              enabled in Groq&apos;s Data Controls.
            </p>
            <p>
              Bluetooth heart-rate and blood-oxygen readings are shown only on your screen while connected. They are not
              uploaded, saved or used to detect overdoses.
            </p>
            <p>
              The camera pulse check asks for camera permission only when you tap it. It reads the brightness of your fingertip in
              each video frame on your phone, shows an estimate, and then turns the camera off. No video, image or result is uploaded
              or saved. The breathing count is a simple tap counter that stays on your screen. Neither is used to detect overdoses.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Appointment-area resource planning</h2>
            <p>
              If you add a 5-digit ZIP to an upcoming appointment or plan and attach a need, NarcoGuard can use that ZIP to look up public resources near the appointment area and compare their listed hours with the appointment time. This uses only the location text you entered. It does not track your background location or calculate your travel route.
            </p>
            <p>
              “Near the appointment ZIP” does not mean a resource is on your route, open, available, eligible, affordable, or guaranteed. Listed hours remain attributed to their public source and NarcoGuard keeps unsupported or missing timing information as unknown.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Adaptive Guardian learning</h2>
            <p>
              Adaptive Guardian is optional and local-first. When you enable it, your Guardian check-ins can include an optional
              return-to-use outcome label. NarcoGuard can calculate descriptive next-check-in transition rates and train small
              experimental neural models in this browser from the entries you voluntarily recorded. Those models can relearn when your local history changes and may preload Maslow-organized resource categories before you explicitly mark a need.
            </p>
            <p>
              The adaptive history and model are not uploaded by this feature. Unknown answers stay unknown, the neural layer
              abstains until it has enough labeled examples, and its output is a personal pattern score rather than a clinically
              calibrated relapse probability. Neural need scores are not calibrated probabilities. Pattern notifications use generic text and do not automatically contact Heroes,
              friends, clinicians, employers or emergency services. Pausing or erasing Guardian data also stops or erases this
              learning history on this device.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Resource verification records</h2>
            <p>
              If you choose to record that you called, checked a website, visited, or otherwise tried to verify a resource,
              NarcoGuard stores that verification only in this browser. The record includes the resource, method, status,
              optional note, verification time, and an automatic expiration time. A user-entered verification is always shown
              separately from public-directory data and does not guarantee a meal, bed, appointment, eligibility, stock, or price
              unless you explicitly confirmed that detail yourself.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Watched resource listing changes</h2>
            <p>
              You can locally mark a resource listing to watch for public-directory changes while the resource screen is being refreshed.
              NarcoGuard compares listed hours and contact details and can note when a watched place is returned again, is not returned in
              the latest lookup, or becomes stale. Not being returned is never treated as proof that a provider closed or became unavailable.
              Watch choices and detailed changes stay in this browser. If notification permission is already granted, the lock-screen notice
              is generic and asks you to open NarcoGuard to review the details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Predicted-need background watches</h2>
            <p>
              Predicted-need background watches are optional and require a separate user action. When enabled, NarcoGuard
              sends only supported practical resource categories and a coarse nearby area to the server for a 24-hour watch.
              The local neural history, pattern scores, and underlying check-ins are not uploaded by this feature. Watches
              expire automatically and do not silently turn unsupported predicted needs into a different Hero-help category.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Momentum rewards</h2>
            <p>
              Momentum rewards are optional and calculated locally from actions you control, such as voluntary check-ins,
              meal logs and completed plan steps. They have no cash value, use no streak penalties, and do not award or
              remove points based on abstinence, return-to-use outcomes, or a neural pattern score.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Community profiles, posts and messages</h2>
            <p>
              The optional Community feature requires an account. If you use it, NarcoGuard stores the community handle, display name and
              bio you choose, posts you publish, connection requests and accepted connections, blocks, and direct messages. Other signed-in
              community members can see community profiles and posts that their access rules allow. Direct messages are limited to accepted,
              unblocked connections.
            </p>
            <p>
              Community features are separate from emergency requests. Do not post another person&apos;s exact location, health information,
              recovery status or other sensitive information without their permission. Blocking is enforced in the community data rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Donations</h2>
            <p>
              Card donations are processed by Stripe on its checkout page. NarcoGuard does not receive your card details;
              Stripe shares the amount and status of the payment so we can confirm it. GoFundMe donations are handled by
              GoFundMe under its own privacy policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Emergency contact texts</h2>
            <p>
              Contacts you add are saved only on your device. To create an invite, NarcoGuard signs the contact&apos;s name, number and
              your name into the invite link; it does not keep a copy. Your contact confirms their number with a code that Twilio
              texts them, and only then can you text them. When you press send, NarcoGuard passes the number and the fixed message
              (plus a map link, only if you choose to include your location) to Twilio, which delivers it and keeps delivery records
              under its own privacy policy. NarcoGuard logs only how many texts were accepted, never names, numbers, locations or
              message text. Contacts can reply STOP to stop all NarcoGuard texts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Accounts, backup, watch registration and Hero certificates</h2>
            <p>
              An account is optional and never needed for emergency help. Encrypted backup seals your contacts and settings on your
              device with a passphrase NarcoGuard never receives; we store only the encrypted result and cannot read it. Your Guardian
              planner is never included. You can delete the backup at any time.
            </p>
            <p>
              Registering a NarcoGuard watch stores its serial number with your account and a salted hash of your account id, so the watch
              can unlock only for you. It does not use or store your location. Hero certification stores only that you passed, the test
              version and the dates; your answers are graded and discarded, never stored or logged.
            </p>
            <p>
              The Hero/resource request infrastructure can be enabled by deployment. Public Hero map data uses coarse areas, not volunteer
              addresses. A resource request stores a coarse nearby area, the requested resource type, timestamps and request status. Exact
              location is stored only when the requester explicitly chooses to share it with the Hero who accepts; it is encrypted at rest
              and cleared when the request is completed or cancelled. Hero availability is voluntary and time-limited, and NarcoGuard does
              not guarantee that a Hero or resource is available.
            </p>
            <p>
              Optional Web Push stores a browser push endpoint so NarcoGuard can send generic notifications. A 24-hour resource watch stores
              your account id, a coarse nearby area, the resource type you chose and an expiration time. Push notifications are intentionally
              generic so a lock screen does not reveal recovery status, a medical condition or the specific resource you requested.
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
