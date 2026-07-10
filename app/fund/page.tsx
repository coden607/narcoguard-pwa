"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Heart, Mail, Share2, Copy, Check, Watch, Shield, Zap, Phone, MapPin, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function FundPage() {
  const [copied, setCopied] = useState(false)

  const GOFUNDME_URL = "https://gofund.me/9acf270ea"
  const APP_URL = "https://narcoguard.app"
  const CONTACT_EMAIL = "narcoguard607@gmail.com"

  const copyLink = async () => {
    await navigator.clipboard.writeText(GOFUNDME_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "NarcoGuard - Save Lives with Auto-Injection Technology",
        text: "Help fund 80 life-saving watches for Broome County, NY. Each watch auto-injects naloxone during overdose.",
        url: GOFUNDME_URL,
      })
    } else {
      copyLink()
    }
  }

  const donationTiers = [
    { amount: 10, description: "Sensor components", impact: "Powers vital sign monitoring" },
    { amount: 25, description: "Naloxone cartridge", impact: "The life-saving medicine itself" },
    { amount: 50, description: "Injection system", impact: "Auto-deployment mechanism" },
    { amount: 100, description: "Half a watch", impact: "50% of one life protected" },
    { amount: 307, description: "ONE FULL WATCH", impact: "ONE LIFE SAVED", highlight: true },
    { amount: 500, description: "Watch + extra cartridge", impact: "Extended protection" },
  ]

  const stats = [
    { value: "130+", label: "Daily US overdose deaths" },
    { value: "80", label: "Watches we're funding" },
    { value: "$307", label: "Cost per watch" },
    { value: "24/7", label: "Protection provided" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Generated Images */}
      <section className="relative py-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background" />
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Campaign Hero Image */}
          <div className="rounded-2xl overflow-hidden mb-8 border border-primary/30">
            <img
              src="/images/gofundme-hero.jpg"
              alt="NarcoGuard - Life-saving technology meets human compassion"
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>

          <div className="text-center">
            <motion.div
              className="inline-flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full mb-6"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            >
              <Heart className="h-4 w-4" />
              <span className="text-sm font-medium">Every 5 minutes, someone in America dies from overdose</span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
              <span className="text-primary">80 Watches</span> = <span className="text-green-400">80 Lives</span> Saved
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              Help us bring life-saving NarcoGuard NG auto-injection watches to Broome County, NY - one of the
              hardest-hit communities in the opioid crisis.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-6"
                onClick={() => window.open(GOFUNDME_URL, "_blank")}
              >
                <Heart className="mr-2 h-5 w-5" />
                Donate Now
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent" onClick={shareNative}>
                <Share2 className="mr-2 h-5 w-5" />
                Share Campaign
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Story */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-8 text-center">Our Story</h2>

            {/* Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl overflow-hidden border border-primary/20">
                <img
                  src="/images/watch-on-wrist-lifestyle.jpg"
                  alt="NarcoGuard NG worn in everyday life - always protecting"
                  className="w-full h-56 object-cover"
                />
                <div className="p-3 bg-card">
                  <p className="text-sm text-muted-foreground">The NarcoGuard NG - silent protection, worn every day</p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-primary/20">
                <img
                  src="/images/broome-county-community.jpg"
                  alt="Binghamton, NY - the community NarcoGuard serves"
                  className="w-full h-56 object-cover"
                />
                <div className="p-3 bg-card">
                  <p className="text-sm text-muted-foreground">Binghamton, NY - our community, our mission</p>
                </div>
              </div>
            </div>

            <Card className="bg-card/50 border-primary/20">
              <CardContent className="p-8">
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg leading-relaxed mb-6">
                    <strong>My name is Stephen Blanford, and I'm a recovering addict from Binghamton, NY.</strong>
                  </p>

                  <p className="mb-6">
                    I've lost too many friends to opioid overdose. Most of them died alone - with no one there to
                    administer naloxone in time. By the time 911 arrived, it was too late.
                  </p>

                  <p className="mb-6">
                    <strong>So I built NarcoGuard.</strong> A smartwatch that monitors vital signs 24/7 and
                    automatically injects naloxone when it detects an overdose. No button to press. No one else needed.
                    It just saves your life.
                  </p>

                  <p className="mb-6">
                    Now I'm raising funds to build <strong>80 watches</strong> and distribute them
                    <strong> completely FREE</strong> to at-risk individuals in Broome County - one of the hardest-hit
                    areas in New York State.
                  </p>

                  <p className="text-primary font-semibold">
                    Every dollar goes directly to watch production. I'm not taking a salary. This is about saving lives
                    - nothing else.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Donation Tiers */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">Your Impact</h2>
          <p className="text-muted-foreground text-center mb-12">Every dollar brings us closer to saving lives</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {donationTiers.map((tier, i) => (
              <motion.div
                key={tier.amount}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className={`h-full ${tier.highlight ? "border-green-500 bg-green-500/10" : ""}`}>
                  <CardContent className="p-6">
                    <div className={`text-3xl font-bold mb-2 ${tier.highlight ? "text-green-400" : "text-primary"}`}>
                      ${tier.amount}
                    </div>
                    <div className="font-semibold mb-2">{tier.description}</div>
                    <div className="text-sm text-muted-foreground">{tier.impact}</div>
                    {tier.highlight && (
                      <div className="mt-4 text-green-400 font-semibold text-sm">Most Popular - Full watch funded!</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white text-lg px-12 py-6"
              onClick={() => window.open(GOFUNDME_URL, "_blank")}
            >
              <Heart className="mr-2 h-5 w-5" />
              Donate Any Amount
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">How NarcoGuard Works</h2>
          <p className="text-muted-foreground text-center mb-8">
            Revolutionary technology that saves lives automatically
          </p>

          {/* NG Watch Showcase */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="rounded-xl overflow-hidden border border-primary/20">
              <img
                src="/images/ng2-watch-hero.jpg"
                alt="NarcoGuard NG auto-injection smartwatch prototype"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-primary/20">
              <img
                src="/images/ng2-exploded-view.jpg"
                alt="NG Watch internal engineering and components"
                className="w-full h-64 object-cover"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Watch, title: "24/7 Monitoring", desc: "Sensors track heart rate, blood oxygen, and breathing" },
              { icon: Zap, title: "AI Detection", desc: "Algorithms identify overdose patterns in real-time" },
              { icon: Shield, title: "Auto-Injection", desc: "4mg naloxone deploys in under 3 seconds" },
              { icon: Phone, title: "Emergency Alert", desc: "911, family, and nearby heroes notified instantly" },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/">
              <Button variant="outline" size="lg">
                Try the App Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Get In Touch</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline text-lg">
                  {CONTACT_EMAIL}
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  Questions about the campaign, partnerships, or press inquiries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">Binghamton, NY</p>
                <p className="text-muted-foreground">Broome County</p>
                <p className="text-sm text-muted-foreground mt-2">Broome Estates LLC</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Card className="inline-block">
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4">Share the campaign link:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-background px-4 py-2 rounded text-primary">{GOFUNDME_URL}</code>
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">Together, We Can End Preventable Overdose Deaths</h2>
            <p className="text-xl text-muted-foreground mb-8">
              80 watches. 80 lives protected. One community at a time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white text-xl px-12 py-8"
                onClick={() => window.open(GOFUNDME_URL, "_blank")}
              >
                <Heart className="mr-2 h-6 w-6" />
                Donate Now
              </Button>
              <Button size="lg" variant="outline" className="text-xl px-12 py-8 bg-transparent" onClick={shareNative}>
                <Share2 className="mr-2 h-6 w-6" />
                Share & Save Lives
              </Button>
            </div>

            <p className="mt-8 text-muted-foreground">Can't donate? Sharing this campaign could save someone's life.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>NarcoGuard</strong> by Broome Estates LLC | Stephen Blanford | Binghamton, NY
          </p>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            {" | "}
            <a href={GOFUNDME_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              GoFundMe
            </a>
            {" | "}
            <Link href="/" className="text-primary hover:underline">
              Try the App
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
