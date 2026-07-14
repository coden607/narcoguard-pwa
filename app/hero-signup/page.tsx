"use client"

import type React from "react"

import { useState } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Shield, Heart, Award, BookOpen, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"

export default function HeroSignup() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    certifiedCPR: false,
    certifiedNaloxone: false,
    agreedToTerms: false,
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Save hero signup data
    const heroes = JSON.parse(localStorage.getItem("narcoguard_heroes") || "[]")
    heroes.push({
      ...formData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    })
    localStorage.setItem("narcoguard_heroes", JSON.stringify(heroes))
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 sm:p-6 flex items-center justify-center">
        <HolographicCard className="p-8 max-w-2xl text-center space-y-6">
          <CheckCircle className="w-24 h-24 mx-auto text-green-500 animate-pulse" />
          <h1 className="text-4xl font-bold glow-text">Welcome to the Hero Network!</h1>
          <p className="text-lg text-muted-foreground">
            Thank you for joining our movement to save lives. Complete your training to start responding to emergencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <GlowButton onClick={() => router.push("/ar")} variant="default">
              Start Training
            </GlowButton>
            <GlowButton onClick={() => router.push("/")} variant="outline">
              Go to Dashboard
            </GlowButton>
          </div>
        </HolographicCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Shield className="w-20 h-20 mx-auto text-primary pulse-glow" />
          <h1 className="text-4xl font-bold glow-text">Become a Hero</h1>
          <p className="text-lg text-muted-foreground">Join the network of trained responders saving lives</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <HolographicCard className="p-6 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="font-bold mb-2">Save Lives</h3>
            <p className="text-sm text-muted-foreground">Be the difference between life and death</p>
          </HolographicCard>
          <HolographicCard className="p-6 text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="font-bold mb-2">Get Certified</h3>
            <p className="text-sm text-muted-foreground">Free CPR and naloxone training</p>
          </HolographicCard>
          <HolographicCard className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <h3 className="font-bold mb-2">Protected</h3>
            <p className="text-sm text-muted-foreground">Good Samaritan law coverage</p>
          </HolographicCard>
        </div>

        <HolographicCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="glass neon-border mt-2"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="glass neon-border mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="glass neon-border mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="experience">Experience (optional)</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="Any medical, first aid, or emergency response experience?"
                  className="glass neon-border mt-2"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold">Current Certifications</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="certifiedCPR"
                    checked={formData.certifiedCPR}
                    onCheckedChange={(checked) => setFormData({ ...formData, certifiedCPR: checked as boolean })}
                  />
                  <Label htmlFor="certifiedCPR" className="cursor-pointer">
                    I am certified in CPR
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="certifiedNaloxone"
                    checked={formData.certifiedNaloxone}
                    onCheckedChange={(checked) => setFormData({ ...formData, certifiedNaloxone: checked as boolean })}
                  />
                  <Label htmlFor="certifiedNaloxone" className="cursor-pointer">
                    I am trained in naloxone administration
                  </Label>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Don't have certifications yet? No problem! We'll provide free training.
              </p>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onCheckedChange={(checked) => setFormData({ ...formData, agreedToTerms: checked as boolean })}
                  required
                />
                <Label htmlFor="agreedToTerms" className="cursor-pointer text-sm">
                  I agree to respond to emergencies in my area, follow proper protocols, and act within Good Samaritan
                  law protections. I understand I will receive training before being activated in the Hero Network.
                </Label>
              </div>
            </div>

            <GlowButton type="submit" className="w-full" size="lg" disabled={!formData.agreedToTerms}>
              Join the Hero Network
            </GlowButton>
          </form>
        </HolographicCard>

        <HolographicCard className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Required Training
          </h3>
          <div className="space-y-3 text-sm">
            <p>All Heroes must complete:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>CPR Certification (hands-only and full CPR)</li>
              <li>Naloxone Administration Training</li>
              <li>Overdose Recognition Training</li>
              <li>VR Simulation Scenarios (optional but recommended)</li>
            </ul>
            <GlowButton onClick={() => router.push("/ar")} variant="outline" className="w-full mt-4">
              Preview Training Modules
            </GlowButton>
          </div>
        </HolographicCard>
      </div>
    </div>
  )
}
