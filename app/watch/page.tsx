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
import { FUNDING_GOAL, PROTOTYPE_UNIT_COST, PROTOTYPE_UNITS } from "@/lib/funding-goal"
import { EngineeringDrawing } from "@/components/watch/engineering-drawing"
import { Watch3D } from "@/components/watch/watch-3d"
import { OwnerLock } from "@/components/watch/owner-lock"

// Candidate bills of materials live in lib/watch-bom.ts; supplier and part numbers require
// confirmation. This is a research concept, not a manufacturing-ready or medical-device BOM.
const VARIANTS = {
  "46": {
    label: "NG 46 mm",
    fit: "Larger wrists",
    model: watchDesignModel,
    calc: watchDesignCalculations,
    geometry: GEOMETRY_46,
    components: WATCH_COMPONENTS,
    bom: BOM_46,
    drawingNumber: "NG-CON-001",
  },
  "40": {
    label: "NG 40 mm",
    fit: "Women's fit, smaller wrists",
    model: watchDesignModel40,
    calc: watchDesignCalculations40,
    geometry: GEOMETRY_40,
    components: WATCH_COMPONENTS_40,
    bom: BOM_40,
    drawingNumber: "NG-CON-040",
  },
} as const
type VariantId = keyof typeof VARIANTS

const { assemblyLabor, qualityTesting, complianceTesting, packaging, naloxoneRefill } = UNIT_COSTS

export default function NGWatchPage() {
  const goFundMeUrl = process.env.NEXT_PUBLIC_GOFUNDME_URL || "https://gofund.me/9acf270ea"
  const investorUrl = process.env.NEXT_PUBLIC_INVESTOR_CONTACT_URL || "mailto:narcoguard607@gmail.com?subject=NarcoGuard%20investment%20inquiry"
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [variantId, setVariantId] = useState<VariantId>("46")
  const variant = VARIANTS[variantId]
  const billOfMaterials = variant.bom
  const totals = bomTotals(billOfMaterials)
  const componentBOMTotal = totals.components
  const totalPerUnit = totals.hardware
  const totalWithNaloxone = totals.complete
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
                Both sizes run the same safety functions: SOS, emergency call, overdose steps and the alarm. The 40 mm is the women&apos;s fit,
                sized for smaller wrists with a smaller case, display and battery; anyone can wear either size.
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
              ))}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {[
              ["Case", `${caseMm} × ${variant.model.caseThicknessMm} mm`],
              ["Display", variant.geometry.ENVELOPE.displayDiameter > 33 ? '1.45" round' : '1.2" round'],
              ["Battery", `${variant.model.nominalBatteryCapacityMah} mAh`],
              ["Strap", `${variant.geometry.ENVELOPE.strapWidth} mm`],
              ["Est. build", `$${totalWithNaloxone.toFixed(2)}`],
            ].map(([term, value]) => (
              <div key={term} className="rounded-lg border border-border/60 p-2">
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="font-mono font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <figure className="mt-4">
            <Image src="/images/ng-sizes-render.jpg" alt="To-scale renders of the NG 46 mm and the NG 40 mm women's fit, side by side" width={1600} height={900} sizes="(min-width: 1280px) 1200px, 100vw" className="w-full h-auto rounded-xl border border-border/60" />
            <figcaption className="mt-1 text-xs text-muted-foreground">Rendered from the same geometry as the drawing and 3D model, with the same camera for both sizes. Concept renders, not photos.</figcaption>
          </figure>
        </section>

        {/* Hero Product Showcase with New Images */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden neon-border">
            <Image src="/images/ng-modular-exploded.jpg" alt="NarcoGuard NG concept exploded view showing candidate modular components" width={1200} height={675} priority className="w-full h-auto object-cover" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl overflow-hidden neon-border flex-1">
              <Image src="/images/ng-blueprint-detailed.jpg" alt="NarcoGuard NG engineering blueprint with cross-section views and dimensions" width={600} height={338} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden neon-border flex-1">
              <Image src="/images/ng-watch-hero.jpg" alt="NarcoGuard NG watch on wrist showing vital signs display" width={600} height={338} className="w-full h-full object-cover" />
            </div>
          </div>
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
              <span className="text-xs font-mono rounded-md border border-primary/40 px-3 py-2 whitespace-nowrap">CONCEPT REV 4.2</span>
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
              <h2 className="text-2xl font-bold text-balance">Up to {PROTOTYPE_UNITS} Prototypes for Field Evaluation</h2>
              <p className="text-muted-foreground mt-1">Each {variant.label} costs <span className="text-green-400 font-bold">${totalWithNaloxone.toFixed(2)}</span> in the current candidate BOM model. Total planning goal: <span className="text-green-400 font-bold">${FUNDING_GOAL.toLocaleString("en-US")}</span> (sized on the 46 mm estimate)</p>
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

        <Tabs defaultValue="blueprint" className="gap-8">
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
              <h2 className="text-xl font-bold mb-2 text-center">Engineering Drawing — {variant.label} Rev 4.2</h2>
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
                    <div className="flex justify-between text-muted-foreground">
                      <span>+ Naloxone cartridge allowance (dose to be set by clinicians)</span>
                      <span className="font-mono">${naloxoneRefill.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-primary/30 pt-2 flex justify-between font-bold text-lg">
                      <span>Complete Unit</span>
                      <span className="font-mono text-green-500">${totalWithNaloxone.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Planning goal for up to {PROTOTYPE_UNITS} prototypes (46 mm estimate)</p>
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
              {billOfMaterials.map((category, catIndex) => (
                <HolographicCard key={catIndex} className="p-6">
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    {category.category}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">{category.description}</p>
                  <div className="overflow-x-auto">
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
              ))}

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
                    <p className="text-xs text-muted-foreground">Per Unit Total</p>
                    <p className="text-xl font-bold font-mono text-green-500">${totalWithNaloxone.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">incl. naloxone</p>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-background/30">
                  <h4 className="font-bold mb-2">Funding Goal: up to {PROTOTYPE_UNITS} Prototypes for a Broome County Pilot</h4>
                  <div className="flex items-center justify-between">
                    <span>{PROTOTYPE_UNITS} units x ${PROTOTYPE_UNIT_COST.toFixed(2)} (46 mm estimate)</span>
                    <span className="text-2xl font-bold text-green-500">${FUNDING_GOAL.toLocaleString("en-US")}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">A {variant.label} build is estimated at ${totalWithNaloxone.toFixed(2)}; a mix of both sizes builds about the same number of prototypes.</p>
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
                    ["Energy harvesting", "Removed: wrist harvesters cannot power a cellular watch"],
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
