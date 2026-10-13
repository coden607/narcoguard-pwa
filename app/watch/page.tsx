"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { ParticleField } from "@/components/effects/particle-field"
import { HolographicCard } from "@/components/effects/holographic-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Syringe,
  Battery,
  Wifi,
  Heart,
  Cpu,
  Shield,
  Smartphone,
  DollarSign,
  Package,
  ExternalLink,
  Watch,
  Cog,
  Satellite,
  Lock,
} from "lucide-react"
import { watchDesignCalculations, watchDesignCalculations40, watchDesignModel, watchDesignModel40 } from "@/lib/watch-design"
import { WATCH_COMPONENTS, WATCH_COMPONENTS_40 } from "@/lib/watch-components"
import { GEOMETRY_40, GEOMETRY_46 } from "@/lib/watch-geometry"
import { BOM_40, BOM_46, UNIT_COSTS, bomTotals } from "@/lib/watch-bom"
import { FUNDING_GOAL } from "@/lib/funding-goal"
import { REV5_POWER_ARCHITECTURE, WATCH_REV5_MODULES } from "@/lib/watch-rev5"
import { EngineeringDrawing } from "@/components/watch/engineering-drawing"
import { Watch3D } from "@/components/watch/watch-3d"
import { OwnerLock } from "@/components/watch/owner-lock"

// Candidate bills of materials live in lib/watch-bom.ts; supplier and part numbers require
// confirmation. This is a research concept, not a manufacturing-ready or medical-device BOM.
const VARIANTS = {
  "46": {
    label: "NG46 Rugged",
    fit: "Larger / rugged fit",
    model: watchDesignModel,
    calc: watchDesignCalculations,
    geometry: GEOMETRY_46,
    components: WATCH_COMPONENTS,
    bom: BOM_46,
    drawingNumber: "NG-CON-001",
  },
  "40": {
    label: "NG40 Elegant",
    fit: "Smaller-wrist / refined fit",
    model: watchDesignModel40,
    calc: watchDesignCalculations40,
    geometry: GEOMETRY_40,
    components: WATCH_COMPONENTS_40,
    bom: BOM_40,
    drawingNumber: "NG-CON-040",
  },
} as const
type VariantId = keyof typeof VARIANTS

const { assemblyLabor, qualityTesting, complianceTesting, packaging } = UNIT_COSTS

const BOM_ICONS = [Cpu, Heart, Wifi, Battery, Smartphone, Syringe, Cog, Shield, Watch] as const

export default function NGWatchPage() {
  const goFundMeUrl = process.env.NEXT_PUBLIC_GOFUNDME_URL || "https://gofund.me/9acf270ea"
  const investorUrl = process.env.NEXT_PUBLIC_INVESTOR_CONTACT_URL || "mailto:narcoguard607@gmail.com?subject=NarcoGuard%20investment%20inquiry"
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [variantId, setVariantId] = useState<VariantId>("46")
  const [activeTab, setActiveTab] = useState("blueprint")
  const variant = VARIANTS[variantId]
  const billOfMaterials = variant.bom
  const totals = bomTotals(billOfMaterials)
  const componentBOMTotal = totals.components
  const totalPerUnit = totals.hardware
  const coreMinimumLayerMarginMm2 = Math.min(...variant.calc.coreLayerMarginsMm2)
  const idealizedRuntimeHours = variant.calc.idealizedRuntimeHours
  const caseMm = variant.model.caseDiameterMm
  const simulationPanels = [
    {
      label: "Sealed core fit",
      value: "Conditional",
      detail: `${variant.model.coreLayers.length} layered planes; minimum ${coreMinimumLayerMarginMm2} mm² planar margin and ${variant.calc.coreThicknessMarginMm} mm modeled stack margin. Medication pod is separate.`,
    },
    {
      label: "Power margin",
      value: "Unverified",
      detail: "Battery and load figures are design targets, not measured data",
    },
    {
      label: "BOM integrity",
      value: `${totals.count} parts`,
      detail: `$${componentBOMTotal.toFixed(2)} candidate component subtotal before labor`,
    },
  ]

  const watchComponents = variant.components

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleField count={80} />
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-secondary/5" />

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold glow-text text-center">NG | NarcoGuard System Blueprint</h1>
          <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-500 hover:bg-green-600 text-black font-bold">
              <DollarSign className="w-4 h-4 mr-2" />
              Fund This
            </Button>
          </a>
        </header>

        <section className="mb-8 rounded-2xl neon-border bg-background/40 p-4" aria-labelledby="size-heading" data-testid="watch-size">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 id="size-heading" className="text-lg font-bold">Choose a size</h2>
              <p className="text-sm text-muted-foreground">
                Both sizes run the same safety functions: SOS, emergency call, overdose steps and the alarm. The 40 mm is the smaller-wrist refined fit, sized with a smaller case, display and battery; anyone can wear either size.
              </p>
            </div>
            <div className="flex shrink-0 gap-2" role="group" aria-label="Watch size">
              {(Object.keys(VARIANTS) as VariantId[]).map((id) => (
                <Button
                  key={id}
                  type="button"
                  variant={variantId === id ? "default" : "outline"}
                  aria-pressed={variantId === id}
                  onClick={() => {
                    setVariantId(id)
                    setSelectedComponent(null)
                  }}
                  className="flex h-auto flex-col items-start px-4 py-2"
                >
                  <span className="font-bold">{VARIANTS[id].label}</span>
                  <span className="text-[11px] font-normal">{VARIANTS[id].fit}</span>
                </Button>
                )
              })}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {[
              ["Case", `${caseMm} × ${variant.model.caseThicknessMm} mm`],
              ["Display", variant.geometry.ENVELOPE.displayDiameter > 33 ? '1.45" round' : '1.2" round'],
              ["Battery", `${variant.model.nominalBatteryCapacityMah} mAh`],
              ["Strap", `${variant.geometry.ENVELOPE.strapWidth} mm`],
              ["Base candidate HW", `${totalPerUnit.toFixed(2)}`],
            ].map(([term, value]) => (
              <div key={term} className="rounded-lg border border-border/60 p-2">
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="font-mono font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <figure className="mt-4" data-testid="rev5-primary-visuals">
            <div className="grid gap-3 lg:grid-cols-2">
              <Image
                src="/images/ng46-rev5-blueprint.svg?rev=5-2026-10-13"
                alt="NarcoGuard NG46 Rev 5 engineering blueprint"
                width={1200}
                height={800}
                priority
                className="w-full h-auto rounded-xl border border-border/60 bg-background"
              />
              <Image
                src="/images/ng40-rev5-blueprint.svg?rev=5-2026-10-13"
                alt="NarcoGuard NG40 Rev 5 engineering blueprint"
                width={1200}
                height={800}
                priority
                className="w-full h-auto rounded-xl border border-border/60 bg-background"
              />
            </div>
            <figcaption className="mt-2 text-xs text-muted-foreground">
              Current Rev 5 engineering blueprints. Earlier lifestyle and size renders are no longer used as the primary watch visual.
            </figcaption>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Button type="button" variant="outline" onClick={() => setActiveTab("blueprint")}>Blueprint layout</Button>
              <Button type="button" variant="outline" onClick={() => setActiveTab("3d-view")}>Interactive 3D view</Button>
              <Button type="button" variant="outline" onClick={() => setActiveTab("bom")}>Rev 5 BOM layout</Button>
            </div>
          </figure>
        </section>

        <section className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-5" data-testid="modular-auto-injector">
          <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-red-300">Rev 5 research module</p>
              <h2 className="mt-1 text-2xl font-bold">Modular auto-injector research pod</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                The medication system is being treated as a separate removable module, not part of the sealed base watch. The base NG46/NG40 remains useful for sensing research, alerts, communications, Hero Network access, and safety functions without a drug-delivery pod attached.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                The pod would require its own isolation boundary, cartridge/service interface, interlocks, status sensing, clinical requirements, pharmaceutical partnership, human-factors work, and FDA combination-product pathway before any human-use claim.
              </p>
              <p className="mt-3 font-semibold text-red-200">
                No NarcoGuard watch currently injects naloxone. Dose, delivery mechanism, activation logic, cartridge, and clinical performance are not finalized.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <h3 className="font-semibold">Module rules</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {WATCH_REV5_MODULES.find((module) => module.id === "auto-injector-module")?.designRules.map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* Rev 5 blueprint + module summary */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HolographicCard className="p-6" glowIntensity="high">
            <h2 className="text-xl font-bold mb-4">Rev 5 blueprint — {variant.label}</h2>
            <Image
              src={variantId === "46" ? "/images/ng46-rev5-blueprint.svg?rev=5-2026-10-13" : "/images/ng40-rev5-blueprint.svg?rev=5-2026-10-13"}
              alt={`${variant.label} Rev 5 concept blueprint`}
              width={1200}
              height={800}
              priority
              className="w-full h-auto rounded-xl border border-border/60"
            />
            <p className="mt-2 text-xs text-muted-foreground">Concept engineering visual only. Supplier CAD, routed PCB, tolerance, RF, thermal, ingress, and physical validation remain open.</p>
          </HolographicCard>
          <HolographicCard className="p-6" glowIntensity="high">
            <h2 className="text-xl font-bold mb-4">Rev 5 power, privacy & modular additions</h2>
            <div className="grid gap-3">
              {WATCH_REV5_MODULES.filter((item) => item.sizes.includes(variantId === "46" ? "NG46" : "NG40")).map((item) => (
                <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-primary">{item.feasibility}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.purpose}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-primary/30 p-3 text-xs text-muted-foreground">
              Primary storage: {REV5_POWER_ARCHITECTURE.primaryStorage}. Primary charging: {REV5_POWER_ARCHITECTURE.primaryCharging}. {REV5_POWER_ARCHITECTURE.rule}
            </div>
          </HolographicCard>
        </section>

        {/* Investor-facing engineering summary */}
        <section className="mb-8 grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-6">
          <HolographicCard className="p-6" glowIntensity="high">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Investor engineering view</p>
                <h2 className="text-2xl font-bold">Numbered NarcoGuard NG System Diagram</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Callouts correspond to the conceptual diagram and the candidate supplier BOM below.
                </p>
              </div>
              <span className="text-xs font-mono rounded-md border border-primary/40 px-3 py-2 whitespace-nowrap">CONCEPT REV 5</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {watchComponents.map((component, index) => (
                <button
                  key={component.id}
                  type="button"
                  onClick={() => setSelectedComponent(component.id)}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 text-left hover:border-primary/60 hover:bg-primary/5 transition-colors"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
                    style={{ backgroundColor: component.color }}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{component.name}</span>
                    <span className="block text-xs text-muted-foreground line-clamp-2">{component.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </HolographicCard>

          <div className="space-y-6">
            <HolographicCard className="p-6">
              <h3 className="font-bold text-lg mb-4">Current Candidate Parts</h3>
              <div className="space-y-3 text-sm">
                {[
                  ["Compute", "W5+ Gen 2", "Qualcomm Snapdragon (2025)"],
                  ["Health MCU", "NRF5340-QKAA-R7", "Nordic nRF5340"],
                  ["Vitals AFE", "MAX86178", "Analog Devices / Maxim"],
                  ["Motion", "LSM6DSO32XTR", "STMicroelectronics"],
                  ["Cellular", "SDX35", "Snapdragon X35 5G RedCap"],
                  ["Barometer", "BMP390", "Bosch Sensortec"],
                ].map(([system, part, maker]) => (
                  <div key={part} className="grid grid-cols-[.8fr_1fr] gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{system}</span>
                    <span><span className="block font-mono text-primary">{part}</span><span className="text-xs">{maker}</span></span>
                  </div>
                ))}
              </div>
            </HolographicCard>

            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <p className="font-semibold text-amber-300">Engineering status</p>
              <p className="text-muted-foreground mt-1">
                This page documents a concept design assembled from commercially available parts. Parts, pricing, performance, medical claims, enclosure tolerances, and injection architecture are proposed design targets. Final selections require supplier confirmation, prototyping, clinical validation, regulatory review, and design-for-manufacture testing before any production or medical-use claim is made.
              </p>
              <a href={investorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 text-primary font-semibold hover:underline">
                Request the investor technical package <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </section>

        {/* Simulation / validation summary */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {simulationPanels.map((panel) => (
            <HolographicCard key={panel.label} className="p-5" glowIntensity="medium">
              <p className="text-xs uppercase tracking-[0.18em] text-primary">{panel.label}</p>
              <p className="mt-2 text-3xl font-bold font-mono">{panel.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{panel.detail}</p>
            </HolographicCard>
          ))}
        </section>

        {/* Funding CTA */}
        <section className="mb-8 p-6 rounded-2xl neon-border bg-linear-to-r from-green-500/20 via-primary/10 to-green-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-balance">Fund Rev 5 Engineering & Validation</h2>
              <p className="text-muted-foreground mt-1">Current planning goal: <span className="text-green-400 font-bold">${FUNDING_GOAL.toLocaleString("en-US")}</span>. This supports CAD, electronics, RF, power, reliability, safety, human-factors, regulatory, and prototype work; it is not a preorder or fixed-watch-count promise.</p>
            </div>
            <div className="flex gap-3">
              <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-green-500 hover:bg-green-600 text-black font-bold">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Donate Now
                </Button>
              </a>
              <a href={investorUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="neon-border bg-transparent">
                  Partner With Us
                </Button>
              </a>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-8">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5 glass neon-border">
            <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
            <TabsTrigger value="3d-view">3D View</TabsTrigger>
            <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
            <TabsTrigger value="specs">Full Specifications</TabsTrigger>
            <TabsTrigger value="owner-lock">Owner Lock</TabsTrigger>
          </TabsList>

          {/* Interactive Blueprint - DEFAULT TAB */}
          <TabsContent value="blueprint">
            <HolographicCard className="p-6" glowIntensity="medium">
              <h2 className="text-xl font-bold mb-2 text-center">Engineering Drawing — {variant.label} Rev 5</h2>
              <EngineeringDrawing key={variantId} selected={selectedComponent} onSelect={setSelectedComponent} geometry={variant.geometry} components={variant.components} modelName={`NARCOGUARD ${variant.label.toUpperCase()}`} drawingNumber={variant.drawingNumber} />

              {selectedComponent && (
                <div className="mt-6 p-4 rounded-lg bg-background/50 neon-border max-w-lg mx-auto">
                  {watchComponents
                    .filter((c) => c.id === selectedComponent)
                    .map((comp) => (
                      <div key={comp.id}>
                        <h3 className="font-bold text-lg" style={{ color: comp.color }}>{comp.name}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{comp.description}</p>
                      </div>
                    ))}
                </div>
              )}

                <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {watchComponents.map((comp, index) => (
                  <button
                    key={comp.id}
                    className={`flex items-center gap-2 p-2 rounded text-left transition-all ${
                      selectedComponent === comp.id ? "bg-primary/20 ring-1 ring-primary/50" : "hover:bg-background/50"
                    }`}
                    onClick={() => setSelectedComponent(selectedComponent === comp.id ? null : comp.id)}
                  >
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black" style={{ backgroundColor: comp.color }}>{index + 1}</div>
                    <span className="text-[11px] leading-tight">{comp.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Core fit margin</p>
                  <p className="mt-1 text-sm text-muted-foreground">Layered core minimum: {coreMinimumLayerMarginMm2} mm² planar margin; modeled stack margin: {variant.calc.coreThicknessMarginMm} mm. CAD interference and tolerances remain required.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Power balance</p>
                  <p className="mt-1 text-sm text-muted-foreground">Battery life and load balance are unverified until measured on a populated prototype.{variantId === "40" ? " The 40 mm has a smaller battery, so expect shorter runtime." : ""}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Runtime model</p>
                  <p className="mt-1 text-sm text-muted-foreground">Idealized energy-only estimate: {idealizedRuntimeHours} hours; radio bursts, conversion losses, temperature, battery aging, and safety reserve are not modeled.</p>
                </div>
              </div>
            </HolographicCard>
          </TabsContent>

          {/* 3D Interactive View */}
          <TabsContent value="3d-view">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HolographicCard className="p-6" glowIntensity="high">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Watch className="w-5 h-5 text-primary" />
                  Interactive 3D Model — {variant.label} (to scale)
                </h2>

                <Watch3D selected={selectedComponent} onSelect={setSelectedComponent} geometry={variant.geometry} />
                {selectedComponent && (
                  <div className="mt-4 rounded-lg border border-primary/40 bg-background/50 p-4" aria-live="polite">
                    {watchComponents.filter((c) => c.id === selectedComponent).map((comp) => (
                      <div key={comp.id}>
                        <h3 className="font-bold" style={{ color: comp.color }}>{comp.name}</h3>
                        <p className="text-xs font-mono text-primary mt-1">{comp.partNumber}</p>
                        <p className="text-sm text-muted-foreground mt-2">{comp.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </HolographicCard>

              <div className="space-y-4">
                <HolographicCard className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    What would set NG apart (targets)
                  </h3>
                  <div className="space-y-3">
                    {[
                      { icon: Syringe, color: "text-red-500", title: "Proposed Naloxone Delivery", desc: "No production watch currently offers this validated capability" },
                      { icon: Satellite, color: "text-green-500", title: "Satellite SOS", desc: "W5+ Gen 2 platform supports satellite emergency messaging where carriers enable it" },
                      { icon: Cog, color: "text-purple-400", title: "Fully Modular", desc: "Modules are replaceable only through a controlled service procedure; every opened seal requires replacement and pressure retest." },
                      { icon: Heart, color: "text-pink-500", title: "Candidate Sensors", desc: "PPG + SpO2 + ECG + motion + skin temperature; overdose detection from the wrist is unproven" },
                      { icon: Cpu, color: "text-blue-400", title: "Candidate Processing", desc: "Wearable compute architecture; firmware and clinical performance unverified" },
                      ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                        <feature.icon className={`w-5 h-5 ${feature.color} shrink-0`} />
                        <div>
                          <p className="font-semibold text-sm">{feature.title}</p>
                          <p className="text-xs text-muted-foreground">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </HolographicCard>

                <HolographicCard className="p-6 bg-linear-to-r from-green-500/10 to-primary/10">
                  <h3 className="font-bold text-lg mb-2">Unit Cost Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Components ({billOfMaterials.reduce((n, c) => n + c.items.length, 0)} parts)</span><span className="font-mono">${componentBOMTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Assembly Labor</span><span className="font-mono">${assemblyLabor.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>QA/Testing (10-point)</span><span className="font-mono">${qualityTesting.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Compliance testing allocation (excludes FDA submission costs)</span><span className="font-mono">${complianceTesting.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Packaging + Charger</span><span className="font-mono">${packaging.toFixed(2)}</span></div>
                    <div className="border-t border-primary/30 pt-2 flex justify-between font-bold">
                      <span>Hardware Total</span>
                      <span className="font-mono text-primary">${totalPerUnit.toFixed(2)}</span>
                    </div>
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-muted-foreground">
                      The removable auto-injector research pod is not included in this hardware estimate. It is unquoted, not functional, and requires separate clinical, pharmaceutical, human-factors, regulatory, and supplier work.
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Rev 5 development-and-validation planning target — not tied to a fixed prototype count</p>
                      <p className="text-xl font-bold text-green-400">${FUNDING_GOAL.toLocaleString("en-US")}</p>
                    </div>
                  </div>
                </HolographicCard>
              </div>
            </div>
          </TabsContent>

          {/* Bill of Materials */}
          <TabsContent value="bom">
            <div className="space-y-6">
              {billOfMaterials.map((category, catIndex) => {
                const CategoryIcon = BOM_ICONS[catIndex] ?? Package
                return (
                <HolographicCard key={category.category} className="p-6">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5">
                      <CategoryIcon className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-primary">Rev 5 subsystem {catIndex + 1}</p>
                      <h3 className="text-lg font-bold">{category.category}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 md:hidden">
                    {category.items.map((item, i) => (
                      <div key={item.partNumber + i} className="rounded-xl border border-border/60 bg-background/40 p-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-bold text-primary">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{item.name}</p>
                            <p className="break-all font-mono text-[11px] text-primary">{item.partNumber}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                              <span>{item.supplier}</span>
                              <span>Qty {item.quantity}</span>
                              <span className="font-mono font-bold">${item.unitPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary/30">
                          <th className="text-left py-2">Component</th>
                          <th className="text-left py-2 hidden lg:table-cell">Description</th>
                          <th className="text-left py-2 hidden md:table-cell">Supplier</th>
                          <th className="text-center py-2">Qty</th>
                          <th className="text-right py-2">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.items.map((item, i) => (
                          <tr key={i} className="border-b border-background/50 hover:bg-background/30">
                            <td className="py-3">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-primary font-mono">{item.partNumber}</p>
                              <p className="text-xs text-muted-foreground lg:hidden mt-1">{item.description}</p>
                            </td>
                            <td className="py-3 hidden lg:table-cell text-muted-foreground text-xs">{item.description}</td>
                            <td className="py-3 hidden md:table-cell text-xs">{item.supplier}</td>
                            <td className="py-3 text-center">{item.quantity}</td>
                            <td className="py-3 text-right font-mono font-bold">${item.unitPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{category.items.length} components</span>
                    <span className="font-mono font-bold text-primary">
                      ${category.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)}
                    </span>
                  </div>
                </HolographicCard>
                )
              })}

              {/* Grand Total */}
              <HolographicCard className="p-6 bg-linear-to-r from-green-500/20 to-primary/20" glowIntensity="high">
                <h3 className="text-xl font-bold mb-4">Prototype Cost Summary - {variant.label}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">Components</p>
                    <p className="text-xl font-bold font-mono">${componentBOMTotal.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{billOfMaterials.reduce((n, c) => n + c.items.length, 0)} parts</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">Labor</p>
                    <p className="text-xl font-bold font-mono">${assemblyLabor.toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">QA + compliance</p>
                    <p className="text-xl font-bold font-mono">${(qualityTesting + complianceTesting).toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">Packaging</p>
                    <p className="text-xl font-bold font-mono">${packaging.toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/20 neon-border">
                    <p className="text-xs text-muted-foreground">Candidate hardware estimate</p>
                    <p className="text-xl font-bold font-mono text-green-500">${totalPerUnit.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">excludes the unquoted auto-injector research pod and any drug product</p>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-background/30">
                  <h4 className="font-bold mb-2">Rev 5 Development & Validation Goal</h4>
                  <div className="flex items-center justify-between gap-4">
                    <span>CAD, PCB/electronics, RF, power, reliability, safety, human factors, regulatory work, and prototype iterations</span>
                    <span className="shrink-0 text-2xl font-bold text-green-500">${FUNDING_GOAL.toLocaleString("en-US")}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">This is a planning budget, not a supplier quote, preorder, or promise to produce a fixed number of watches. Candidate BOM figures remain engineering estimates until vendor quotes and physical builds exist.</p>
                  <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer" className="block mt-4">
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-bold" size="lg">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Support This Project on GoFundMe
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </HolographicCard>
            </div>
          </TabsContent>

          {/* Technical Specifications */}
          <TabsContent value="owner-lock">
            <HolographicCard className="p-6" glowIntensity="medium">
              <OwnerLock />
            </HolographicCard>
          </TabsContent>

          <TabsContent value="specs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: Cpu, color: "text-primary", title: "Processing & Memory",
                  specs: [
                    ["Primary SoC", "Qualcomm Snapdragon W5+ Gen 2 (4nm, 2025)"],
                    ["Always-on", "Platform co-processor for low-power sensing"],
                    ["Safety MCU", "Nordic nRF5340 (independent alarm path)"],
                    ["RAM", "2GB LPDDR4X"],
                    ["Storage", "32GB eMMC 5.1"],
                    ["OS", "Wear OS (NarcoGuard app not yet written)"],
                  ]
                },
                {
                  icon: Heart, color: "text-red-500", title: "Health Sensors (candidate)",
                  specs: [
                    ["Optical PPG", "Analog Devices MAX86178 (accuracy to be measured)"],
                    ["ECG", "Single-lead electrocardiogram (on-demand)"],
                    ["SpO2", "Wrist estimate; accuracy across skin tones must be validated"],
                    ["BioZ", "Body impedance analysis (hydration, composition)"],
                    ["Skin Temperature", "Melexis MLX90632 IR (trend only)"],
                    ["EDA (research)", "ams-OSRAM AS7038RB candidate"],
                    ["Motion", "STMicro LSM6DSO32X 6-axis IMU (32g)"],
                    ["Compass", "STMicro LIS2MDL 3-axis magnetometer"],
                    ["Barometer", "Bosch BMP390 (altitude, weather)"],
                    ["Fall Detection", "Planned; algorithm not written"],
                  ]
                },
                {
                  icon: Wifi, color: "text-cyan-400", title: "Connectivity",
                  specs: [
                    ["Cellular", "Snapdragon X35 5G RedCap + LTE fallback; carrier certification unverified"],
                    ["eSIM", "STMicro ST4SIM-200M eUICC; carrier support unverified"],
                    ["Satellite", "SOS messaging via W5+ Gen 2 (Skylo NB-NTN) where available"],
                    ["Wi-Fi", "Infineon CYW43022 candidate; Wi-Fi standard and RF integration unverified"],
                    ["Bluetooth", "Bluetooth LE (version per final radio)"],
                    ["GNSS", "Platform/modem GNSS (L1+L5 capable); no separate chip"],
                    ["NFC", "STMicro ST54K (emergency ID; payments need certification)"],
                  ]
                },
                {
                  icon: Battery, color: "text-green-500", title: "Candidate Sealed Power System",
                  specs: [
                    ["Battery", `${variant.model.nominalBatteryCapacityMah}mAh Li-ion polymer, IEC 62133-2 / UN38.3 certified cell required`],
                    ["Battery Life", "Unknown until measured; cellular watches typically need daily charging"],
                    ["Energy harvesting", "Rev 5 research: crown generator, photovoltaic ring, thermoelectric path and automatic rotor feed an isolated reserve; none is claimed to continuously power the cellular watch"],
                    ["Wireless Charging", variantId === "40" ? "Qi (TI BQ51013B) with a smaller receive coil" : "Qi (TI BQ51013B, 5W)"],
                    ["Charging boundary", "No external USB-C port; sealed Qi charging target"],
                    ["Low-battery mode", "Target: keep alarms and SOS working; duration to be measured"],
                  ]
                },
                {
                  icon: Syringe, color: "text-red-500", title: "Naloxone Delivery (future research)",
                  specs: [
                    ["Status", "Not built, not tested, not approved"],
                    ["Regulation", "FDA drug-device combination product (approval required)"],
                    ["Dose & route", "To be set by clinicians (prior auto-injector: 2 mg / 0.4 mL IM or SC)"],
                    ["Needle", "Gauge and length to be specified for intramuscular delivery"],
                    ["Drug supply", "Licensed pharmaceutical partner with stability data"],
                    ["Actuator", "Faulhaber 0206B candidate; force and reliability unproven"],
                    ["Trigger", "Would require validated detection plus a person-confirmable cancel"],
                  ]
                },
                {
                  icon: Smartphone, color: "text-blue-500", title: "Display, Audio & Haptics",
                  specs: [
                    ["Display", variantId === "40" ? "1.2 in round AMOLED, about 396×396 (supplier quote pending)" : "1.4–1.5 in round LTPO AMOLED (supplier quote pending)"],
                    ["Always-On", "Target, with low-power refresh"],
                    ["Glass", "Lab-grown sapphire crystal (9H)"],
                    ["Touch", "Capacitive touch"],
                    ["Speaker", "Sealed micro speaker; alarm loudness to be measured"],
                    ["Microphone", "Knowles SPH0645 MEMS (voice for Angel AI)"],
                    ["Haptics", "TDK PowerHap 1204H piezoelectric"],
                  ]
                },
                {
                  icon: Shield, color: "text-amber-400", title: "Physical & Durability",
                  specs: [
                    ["Case", "Grade 5 Titanium (Ti-6Al-4V) + PVD"],
                    ["Back", "Zirconia ceramic with sensor windows"],
                    ["Dimensions", `Target ${caseMm}mm case, about ${variant.model.caseThicknessMm}mm thick (CAD pending)`],
                    ["Weight", "Unknown until a prototype is built"],
                    ["Water Rating", "Target IP68/ISO 22810; qualification unverified"],
                    ["Temp Range", "Target -20C to +55C (untested)"],
                    ["Strap", variantId === "40" ? "20mm quick-release silicone with S/M and M/L bands for smaller wrists; biocompatibility unverified" : "22mm quick-release candidate silicone; biocompatibility and ingress effects unverified"],
                    ["Gaskets", "Fluoroelastomer (FKM) seals, supplier TBD"],
                    ["Modular Parts", "Battery, strap, glass; service seals require post-service pressure testing"],
                  ]
                },
                {
                  icon: Lock, color: "text-amber-400", title: "Security & Privacy (targets)",
                  specs: [
                    ["Screen lock", "PIN/pattern via Wear OS"],
                    ["Encryption", "Target: encrypted storage via the platform; not yet verified"],
                    ["Health privacy", "Privacy and security review required; no HIPAA claim is made"],
                    ["Lost device", "Target: remote lock/erase; not implemented"],
                    ["Device ID", "Serial number + device certificate (target)"],
                  ]
                },
              ].map((section, idx) => (
                <HolographicCard key={idx} className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <section.icon className={`w-5 h-5 ${section.color}`} />
                    {section.title}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {section.specs.map(([label, value], i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-background/50">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-right max-w-[55%]">{value}</span>
                      </div>
                    ))}
                  </div>
                </HolographicCard>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
