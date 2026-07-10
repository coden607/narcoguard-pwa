"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { ParticleField } from "@/components/effects/particle-field"
import { HolographicCard } from "@/components/effects/holographic-card"
import { VitalsMonitor } from "@/components/dashboard/vitals-monitor"
import { EmergencyButton } from "@/components/emergency/emergency-button"
import { HeroNetworkStatus } from "@/components/hero/hero-network-status"
import { GuardianAI } from "@/components/ai/guardian-ai"
import { NG2WatchStatus } from "@/components/watch/ng2-watch-status"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import {
  Heart,
  Shield,
  Users,
  Zap,
  Syringe,
  SkipForward,
  AlertTriangle,
  Eye,
  Mail,
  DollarSign,
  ExternalLink,
} from "lucide-react"
import { getUserPreferences, saveUserPreferences } from "@/lib/user-preferences"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const OnboardingFlow = dynamic(
  () => import("@/components/onboarding/onboarding-flow").then((mod) => ({ default: mod.OnboardingFlow })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Guardian AI...</p>
        </div>
      </div>
    ),
  },
)

export default function DashboardPage() {
  const goFundMeUrl = process.env.NEXT_PUBLIC_GOFUNDME_URL || "https://gofund.me/9acf270ea"
  const investorUrl = process.env.NEXT_PUBLIC_INVESTOR_CONTACT_URL || "mailto:narcoguard607@gmail.com?subject=NarcoGuard%20investment%20inquiry"
  const [mounted, setMounted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [skippedSetup, setSkippedSetup] = useState(false)
  const [showSkipWarning, setShowSkipWarning] = useState(false)

  useEffect(() => {
    setMounted(true)
    const preferences = getUserPreferences()
    setShowOnboarding(!preferences.hasCompletedOnboarding)
    setSkippedSetup(preferences.skippedSetup || false)
  }, [])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  const handleSkipSetup = () => {
    const preferences = getUserPreferences()
    saveUserPreferences({
      ...preferences,
      skippedSetup: true,
      hasCompletedOnboarding: true,
    })
    setSkippedSetup(true)
    setShowOnboarding(false)
  }

  const handleCompleteSetup = () => {
    const preferences = getUserPreferences()
    saveUserPreferences({
      ...preferences,
      skippedSetup: false,
      hasCompletedOnboarding: false,
    })
    setSkippedSetup(false)
    setShowOnboarding(true)
  }

  if (!mounted) return null

  if (showOnboarding && !showSkipWarning) {
    return (
      <div className="relative">
        <OnboardingFlow onComplete={handleOnboardingComplete} />
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setShowSkipWarning(true)}
            variant="outline"
            className="glass neon-border bg-background/80 hover:bg-background"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip Setup (Demo Mode)
          </Button>
        </div>
      </div>
    )
  }

  if (showSkipWarning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ParticleField count={30} />
        <HolographicCard className="max-w-lg p-8 text-center relative z-10" glowIntensity="high">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center pulse-glow">
            <AlertTriangle className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 glow-text">Skip Setup Warning</h2>
          <p className="text-muted-foreground mb-6">
            Skipping setup means emergency contacts, naloxone locations, and preferences won't be configured. The app
            will work in <span className="text-primary font-semibold">Demo Mode</span> with limited functionality.
          </p>
          <p className="text-sm text-yellow-500 mb-6 font-semibold">
            For full life-saving features, complete the Guardian AI setup.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setShowSkipWarning(false)}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              Go Back to Setup
            </Button>
            <Button onClick={handleSkipSetup} variant="outline" className="w-full bg-transparent">
              Continue to Demo Mode
            </Button>
          </div>
        </HolographicCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleField count={100} />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 animate-pulse" />

      <div className="relative z-10 container mx-auto px-4 py-6 space-y-6">
        {skippedSetup && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-semibold text-yellow-500">Demo Mode Active</p>
                <p className="text-sm text-muted-foreground">Complete setup for full emergency features</p>
              </div>
            </div>
            <Button onClick={handleCompleteSetup} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black">
              Complete Setup
            </Button>
          </div>
        )}

        <HolographicCard
          className="p-4 bg-gradient-to-r from-green-500/20 to-primary/20 border-green-500/50"
          glowIntensity="medium"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20 pulse-glow">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-green-400">Help Fund 80 Life-Saving Watches for Broome County</p>
                <p className="text-sm text-muted-foreground">Your donation directly saves lives</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-500 hover:bg-green-600 text-black font-bold">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Donate Now
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a href="mailto:narcoguard607@gmail.com">
                <Button variant="outline" className="border-green-500/50 hover:bg-green-500/20 bg-transparent">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Us
                </Button>
              </a>
              <a href={investorUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-primary/50 hover:bg-primary/20 bg-transparent">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Investors
                </Button>
              </a>
            </div>
          </div>
        </HolographicCard>

        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 float-animation">
              <img
                src="/images/narcoguard-icon.jpeg"
                alt="Narcoguard"
                className="w-full h-full rounded-full pulse-glow"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold glow-text font-[family-name:var(--font-orbitron)]">NARCOGUARD</h1>
              <p className="text-primary text-sm font-semibold flex items-center gap-2">
                <Syringe className="w-4 h-4" />
                NG2 Auto-Injection System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/fund">
              <Button className="bg-green-500 hover:bg-green-600 text-black font-bold">
                <DollarSign className="w-4 h-4 mr-2" />
                Fund Us
              </Button>
            </Link>
            <Link href="/ng2-watch">
              <Button variant="outline" className="glass neon-border bg-transparent">
                <Eye className="w-4 h-4 mr-2" />
                View NG2 Watch
              </Button>
            </Link>
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full neon-border">
              <div className="w-3 h-3 rounded-full bg-green-500 pulse-glow" />
              <span className="text-sm font-medium">{skippedSetup ? "Demo Mode" : "System Active"}</span>
            </div>
          </div>
        </header>

        <HolographicCard className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-secondary/10" glowIntensity="high">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-primary/20 pulse-glow">
              <Syringe className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold glow-text font-[family-name:var(--font-orbitron)]">
                NARCOGUARD 2 AUTO-INJECTION TECHNOLOGY
              </h2>
              <p className="text-muted-foreground mt-1 text-balance">
                Revolutionary wearable technology that automatically detects overdose signs and deploys naloxone in
                seconds. Connected to this app for 24/7 monitoring, emergency coordination, and life-saving
                intervention.
              </p>
            </div>
          </div>
        </HolographicCard>

        <EmergencyButton />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <VitalsMonitor />
            <NG2WatchStatus />
          </div>

          <div className="space-y-6">
            <GuardianAI />
            <QuickActions />
          </div>

          <div className="space-y-6">
            <HeroNetworkStatus />
            <ActivityFeed />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HolographicCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20 pulse-glow">
                <Heart className="w-6 h-6 text-primary heartbeat" />
              </div>
              <div>
                <p className="text-2xl font-bold">98</p>
                <p className="text-sm text-muted-foreground">BPM</p>
              </div>
            </div>
          </HolographicCard>

          <HolographicCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20 pulse-glow">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-sm text-muted-foreground">Protected</p>
              </div>
            </div>
          </HolographicCard>

          <HolographicCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-secondary/20 pulse-glow">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Heroes Nearby</p>
              </div>
            </div>
          </HolographicCard>

          <HolographicCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/20 pulse-glow">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-sm text-muted-foreground">Watch Battery</p>
              </div>
            </div>
          </HolographicCard>
        </div>

        <HolographicCard
          className="p-8 bg-gradient-to-br from-green-500/10 via-primary/10 to-secondary/10"
          glowIntensity="high"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold glow-text mb-2">Support the Mission</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every donation helps us manufacture and distribute life-saving NG2 watches to those who need them most.
              Together, we can end preventable overdose deaths.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="glass p-6 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-400">Donate via GoFundMe</h3>
                  <p className="text-sm text-muted-foreground">100% goes to watch production</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Goal: <span className="text-green-400 font-bold">$24,584</span> for 80 watches
              </p>
              <a href="https://gofund.me/9acf270ea" target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-bold text-lg py-6">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Donate Now
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>

            <div className="glass p-6 rounded-xl border border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">Contact Us Directly</h3>
                  <p className="text-sm text-muted-foreground">Partnerships, grants, inquiries</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Email: <span className="text-primary font-bold">narcoguard607@gmail.com</span>
              </p>
              <a href="mailto:narcoguard607@gmail.com" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90 font-bold text-lg py-6">
                  <Mail className="w-5 h-5 mr-2" />
                  Send Email
                </Button>
              </a>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Broome Estates LLC | Stephen Blanford, Founder</p>
            <p className="mt-1">Binghamton, NY | Serving Broome County and Beyond</p>
          </div>
        </HolographicCard>

        <footer className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Created by <span className="text-primary font-semibold">Stephen Blanford</span> | Broome Estates LLC
          </p>
          <p className="text-xs mt-2">Inspired by family and friends. Saving lives, one guardian at a time.</p>
          <p className="text-xs mt-2 text-primary font-semibold">Not just saving lives - transforming them.</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <a href="mailto:narcoguard607@gmail.com" className="text-primary hover:underline text-sm">
              narcoguard607@gmail.com
            </a>
            <span className="text-muted-foreground">|</span>
            <a
              href="https://gofund.me/9acf270ea"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline text-sm"
            >
              Support on GoFundMe
            </a>
          </div>
        </footer>
      </div>

    </div>
  )
}
