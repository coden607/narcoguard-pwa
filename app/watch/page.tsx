"use client"

import type React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import { ParticleField } from "@/components/effects/particle-field"
import { HolographicCard } from "@/components/effects/holographic-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  RotateCcw,
  ZoomIn,
  ZoomOut,
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
  Sun,
  Fingerprint,
  Watch,
  Cog,
  Thermometer,
  Lock,
} from "lucide-react"
import Link from "next/link"
import { watchDesignCalculations, watchDesignModel } from "@/lib/watch-design"

// =============================================================================
// CANDIDATE BILL OF MATERIALS - supplier and part numbers require confirmation.
// This is a research concept, not a manufacturing-ready or medical-device BOM.
// =============================================================================
const billOfMaterials = [
  {
    category: "Main Processing Unit",
    description: "Dual-processor architecture for health AI + smartwatch OS simultaneously",
    items: [
      {
        name: "Qualcomm Snapdragon W5+ Gen 1",
        description: "Primary smartwatch SoC - 4nm, quad-core Cortex-A53 1.7GHz, Adreno 702 GPU, same chip as Samsung Galaxy Watch 6",
        quantity: 1,
        unitPrice: 24.00,
        supplier: "Qualcomm",
        partNumber: "SW5100",
        datasheet: "qualcomm.com/products/wearables",
      },
      {
        name: "Nordic nRF5340 Co-Processor",
        description: "Dedicated always-on health monitoring co-processor, dual-core ARM Cortex-M33, handles vitals + overdose AI while main SoC sleeps",
        quantity: 1,
        unitPrice: 8.50,
        supplier: "Nordic Semiconductor",
        partNumber: "NRF5340-QKAA-R7",
        datasheet: "nordicsemi.com/nRF5340",
      },
      {
        name: "Micron MT29F4G01ABAFDWB",
        description: "4GB NAND flash storage for OS, apps, health data, maps",
        quantity: 1,
        unitPrice: 3.20,
        supplier: "Micron Technology",
        partNumber: "MT29F4G01ABAFDWB-IT:F",
        datasheet: "micron.com",
      },
      {
        name: "Micron MT53E512M32D2DS-046",
        description: "2GB LPDDR4X RAM",
        quantity: 1,
        unitPrice: 5.80,
        supplier: "Micron Technology",
        partNumber: "MT53E512M32D2DS-046 WT:A",
        datasheet: "micron.com",
      },
    ],
  },
  {
    category: "Health & Biometric Sensors (Candidate)",
    description: "Candidate sensor array for research; accuracy and overdose-detection performance are unverified",
    items: [
      {
        name: "Maxim MAX86178",
        description: "Optical PPG + ECG + BioZ combo sensor - heart rate, SpO2, single-lead ECG, body impedance. Same class as Apple Watch Series 9 sensor",
        quantity: 1,
        unitPrice: 12.50,
        supplier: "Analog Devices (Maxim)",
        partNumber: "MAX86178",
        datasheet: "maximintegrated.com/MAX86178",
      },
      {
        name: "Bosch BMP390",
        description: "Barometric pressure sensor for altimeter, elevation tracking, weather",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Bosch Sensortec",
        partNumber: "BMP390",
        datasheet: "bosch-sensortec.com/BMP390",
      },
      {
        name: "STMicro LSM6DSO32X",
        description: "6-axis IMU (accelerometer 32g + gyroscope) for fall detection, step counting, sleep tracking, kinetic energy measurement",
        quantity: 1,
        unitPrice: 4.20,
        supplier: "STMicroelectronics",
        partNumber: "LSM6DSO32XTR",
        datasheet: "st.com/LSM6DSO32X",
      },
      {
        name: "STMicro LIS2MDL",
        description: "3-axis magnetometer/compass for navigation and GPS assist",
        quantity: 1,
        unitPrice: 1.80,
        supplier: "STMicroelectronics",
        partNumber: "LIS2MDLTR",
        datasheet: "st.com/LIS2MDL",
      },
      {
        name: "Melexis MLX90632",
        description: "candidate non-contact infrared skin-temperature sensor; accuracy depends on the selected variant and requires validation",
        quantity: 1,
        unitPrice: 6.50,
        supplier: "Melexis",
        partNumber: "MLX90632SFE-BAA-000-RE",
        datasheet: "melexis.com/MLX90632",
      },
      {
        name: "ams AS7038RB",
        description: "Electrodermal activity (EDA/GSR) sensor for stress monitoring and cEDA (like Fitbit Sense)",
        quantity: 1,
        unitPrice: 3.90,
        supplier: "ams-OSRAM",
        partNumber: "AS7038RB",
        datasheet: "ams-osram.com",
      },
      {
        name: "Goodix GH3220",
        description: "Optical fingerprint sensor embedded in crown button - biometric lock ties watch to registered owner, prevents resale/theft",
        quantity: 1,
        unitPrice: 4.50,
        supplier: "Goodix Technology",
        partNumber: "GH3220",
        datasheet: "goodix.com",
      },
      {
        name: "Interlink FSR 402",
        description: "Force-sensitive resistor for skin contact detection before injection",
        quantity: 1,
        unitPrice: 4.50,
        supplier: "Interlink Electronics",
        partNumber: "FSR-402",
        datasheet: "interlinkelectronics.com",
      },
    ],
  },
  {
    category: "Connectivity (sealed eSIM + multi-band)",
    description: "Candidate standalone connectivity; carrier and RF integration are unverified",
    items: [
      {
        name: "Qualcomm SDX35 4G LTE Modem (Candidate)",
        description: "Candidate 4G LTE wearable modem path; carrier, antenna, eSIM, and regulatory integration are unverified",
        quantity: 1,
        unitPrice: 18.00,
        supplier: "Qualcomm",
        partNumber: "SDX35",
        datasheet: "qualcomm.com",
      },
      {
        name: "STMicro ST54K NFC Controller",
        description: "NFC for contactless payments (Google Pay), emergency ID scan, and quick device pairing",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "STMicroelectronics",
        partNumber: "ST54K",
        datasheet: "st.com/ST54",
      },
      {
        name: "Broadcom BCM47765 GNSS",
        description: "Candidate multi-constellation GNSS path; accuracy depends on antenna, RF design, sky view, corrections, and field testing",
        quantity: 1,
        unitPrice: 5.50,
        supplier: "Broadcom",
        partNumber: "BCM47765",
        datasheet: "broadcom.com",
      },
      {
        name: "Infineon CYW43022 Wi-Fi/BT",
        description: "Candidate Wi-Fi/Bluetooth combo; standard and RF integration require confirmation",
        quantity: 1,
        unitPrice: 4.80,
        supplier: "Infineon (Cypress)",
        partNumber: "CYW43022KUBG",
        datasheet: "infineon.com/CYW43022",
      },
      {
        name: "Thales ELS62T1 eSIM",
        description: "Embedded SIM chip (eUICC) with remote provisioning, supports any carrier worldwide",
        quantity: 1,
        unitPrice: 2.50,
        supplier: "Thales Group",
        partNumber: "ELS62T1",
        datasheet: "thalesgroup.com",
      },
      {
        name: "Taoglas FXP840.07.0100A",
        description: "Ultra-wideband (UWB) ceramic antenna for precise indoor positioning and Find My Watch",
        quantity: 1,
        unitPrice: 3.20,
        supplier: "Taoglas",
        partNumber: "FXP840.07.0100A",
        datasheet: "taoglas.com",
      },
    ],
  },
  {
    category: "Candidate Sealed Power System (harvesting + Qi)",
    description: "Candidate power architecture. Harvesting, battery life, thermal behavior, and safety require bench validation.",
    items: [
      {
        name: "Samsung SDI 503535 LiPo Cell",
        description: "500mAh curved lithium polymer battery, custom form factor to match case curvature. 800+ charge cycle life",
        quantity: 1,
        unitPrice: 8.50,
        supplier: "Samsung SDI",
        partNumber: "503535",
        datasheet: "samsungsdi.com",
      },
      {
        name: "Alta Devices Single-Junction GaAs Solar Cell",
        description: "Candidate flexible solar source; output, area, illumination, orientation, thermal behavior, and conversion losses are unverified",
        quantity: 1,
        unitPrice: 18.00,
        supplier: "Alta Devices (Hanergy)",
        partNumber: "AltaDevices-FlexCell-1W",
        datasheet: "altadevices.com",
      },
      {
        name: "Kinetron MGS 26.4 Micro Energy Generator",
        description: "Candidate kinetic source; harvested power and mechanical integration require measurement",
        quantity: 1,
        unitPrice: 22.00,
        supplier: "Kinetron BV",
        partNumber: "MGS-26.4",
        datasheet: "kinetron.eu",
      },
      {
        name: "Micropelt MPG-D751 Thermogenerator",
        description: "Candidate thermoelectric source; output depends on thermal path and environment and requires measurement",
        quantity: 1,
        unitPrice: 14.00,
        supplier: "Micropelt GmbH",
        partNumber: "MPG-D751",
        datasheet: "micropelt.com",
      },
      {
        name: "Texas Instruments BQ51013B",
        description: "Qi-compatible wireless charging receiver IC, 5W input",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Texas Instruments",
        partNumber: "BQ51013BRHLR",
        datasheet: "ti.com/BQ51013B",
      },
      {
        name: "Wurth 760308103 Qi Coil",
        description: "Wireless charging receive coil, 20mm diameter",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Wurth Elektronik",
        partNumber: "760308103",
        datasheet: "we-online.com",
      },
      {
        name: "Texas Instruments BQ25619",
        description: "Single-input battery charger/power-path IC candidate; separate source arbitration and regulation would be required for multiple harvesters",
        quantity: 1,
        unitPrice: 3.50,
        supplier: "Texas Instruments",
        partNumber: "BQ25619RTWR",
        datasheet: "ti.com/BQ25619",
      },
    ],
  },
  {
    category: "Display, Audio & Haptics",
    description: "Candidate display, audio, and haptic modules; brightness, acoustics, ingress, and reliability require qualification",
    items: [
      {
        name: 'BOE 1.45" LTPO AMOLED Display',
        description: '1.45" round 466x466 LTPO AMOLED, 326 PPI, 2000 nits peak brightness, always-on display 1-120Hz adaptive refresh. Same class as Apple Watch Series 9',
        quantity: 1,
        unitPrice: 32.00,
        supplier: "BOE Technology",
        partNumber: "AV145ZPM-N10",
        datasheet: "boe.com",
      },
      {
        name: "Knowles SPH0645LM4H-B MEMS Mic",
        description: "Digital MEMS microphone with noise cancellation for voice commands, emergency calls, voice-to-text",
        quantity: 1,
        unitPrice: 1.50,
        supplier: "Knowles Corporation",
        partNumber: "SPH0645LM4H-B",
        datasheet: "knowles.com",
      },
      {
        name: "AAC ACAM3825-T-A1 Micro Speaker",
        description: "Candidate micro-speaker; acoustic output and emergency-alarm audibility require enclosure measurements",
        quantity: 1,
        unitPrice: 2.20,
        supplier: "AAC Technologies",
        partNumber: "ACAM3825-T-A1",
        datasheet: "aactechnologies.com",
      },
      {
        name: "TDK PowerHap 1204H018V",
        description: "Piezoelectric haptic actuator for precise taptic feedback (Apple-quality haptics). Waveform library for distinct notification patterns",
        quantity: 1,
        unitPrice: 3.80,
        supplier: "TDK Corporation",
        partNumber: "1204H018V",
        datasheet: "tdk.com/PowerHap",
      },
    ],
  },
  {
    category: "Naloxone Auto-Injection System (Patent-Pending)",
    description: "Research-only medication-delivery concept. No actuator, cartridge, or medication behavior is implemented or validated",
    items: [
      {
        name: "Faulhaber 0206B Micro DC Motor",
        description: "1.9mm diameter coreless micro motor drives the injection plunger. 0.07mNm torque, 16000 RPM. Swiss precision manufacturing",
        quantity: 1,
        unitPrice: 28.00,
        supplier: "Faulhaber Group",
        partNumber: "0206B-012-SR",
        datasheet: "faulhaber.com/0206B",
      },
      {
        name: "Custom Micro-Needle Cartridge Assembly",
        description: " candidate 316L stainless steel retractable 30-gauge micro-needle (0.3mm), spring-loaded with 4mm penetration depth. Needle retracts and locks after use",
        quantity: 1,
        unitPrice: 15.00,
        supplier: "Nanopass Technologies / Custom",
        partNumber: "NG-NEEDLE-30G-4MM",
        datasheet: "nanopass.com",
      },
      {
        name: "Naloxone Cartridge Housing (Modular)",
        description: "Candidate COC reservoir concept; capacity, sterility, shelf life, and snap-fit sealing require validated packaging and stability data",
        quantity: 1,
        unitPrice: 8.00,
        supplier: "Gerresheimer AG / Custom",
        partNumber: "NG-CART-COC-04ML",
        datasheet: "gerresheimer.com",
      },
      {
        name: "Takasago Fluidic SMVT Micro Valve",
        description: "Normally-closed micro solenoid valve controls naloxone flow. 0.5ms response time, zero dead volume",
        quantity: 1,
        unitPrice: 12.00,
        supplier: "Takasago Fluidic Systems",
        partNumber: "SMVT-3M2-NO",
        datasheet: "takasago-fluidics.com",
      },
      {
        name: "Epson S1V30340 Voice Synth IC",
        description: "Dedicated speech synthesis chip for verbal overdose alerts and Narcan administration guidance during emergency",
        quantity: 1,
        unitPrice: 4.50,
        supplier: "Epson",
        partNumber: "S1V30340",
        datasheet: "epson.com",
      },
    ],
  },
  {
    category: "Enclosure, Strap & Modular Assembly",
    description: "Built to last a lifetime with individually replaceable modules. Biometric-locked to prevent theft/resale",
    items: [
      {
        name: "Grade 5 Titanium (Ti-6Al-4V) Case",
        description: "Candidate CNC Ti-6Al-4V enclosure; coating, ingress protection, pressure rating, and thermal/mechanical performance require qualification",
        quantity: 1,
        unitPrice: 38.00,
        supplier: "Custom CNC (Foxconn Interconnect)",
        partNumber: "NG-CASE-TI6AL4V-R4",
        datasheet: "N/A - Custom",
      },
      {
        name: "Sapphire Crystal Watch Glass",
        description: "Lab-grown sapphire with multi-layer AR coating. 9H hardness, scratch-proof. 46mm diameter, 0.8mm thick",
        quantity: 1,
        unitPrice: 16.00,
        supplier: "Swiss Jewel Company",
        partNumber: "SJ-SAP-46-08",
        datasheet: "swissjewel.com",
      },
      {
        name: "Medical Silicone Sport Strap (w/ Quick-Release)",
        description: "Candidate LSR silicone strap with 22mm interface; biocompatibility, skin contact, washability, and sensor integration require qualification",
        quantity: 1,
        unitPrice: 6.00,
        supplier: "Custom (Shin-Etsu Chemical)",
        partNumber: "NG-STRAP-LSR-22MM",
        datasheet: "shinetsu.com",
      },
      {
        name: "10-Layer HDI PCB Assembly",
        description: "High-density interconnect PCB with all SMD components placed. Rigid-flex design connects main board to sensor boards. Lead-free RoHS",
        quantity: 1,
        unitPrice: 28.00,
        supplier: "JLCPCB / PCBWay",
        partNumber: "NG-PCBA-R4-10L",
        datasheet: "N/A - Custom",
      },
      {
        name: "IP68 Gasket Set (Viton)",
        description: "Candidate fluoroelastomer seals for case back, crown, sensor windows, acoustic membranes, and service bay; compression and chemical compatibility require qualification",
        quantity: 1,
        unitPrice: 3.50,
        supplier: "Parker Hannifin",
        partNumber: "NG-GASKET-VITON-SET",
        datasheet: "parker.com",
      },
      {
        name: "Modular Snap-Fit Connector System",
        description: "Internal pogo-pin service interfaces with keyed alignment; any user-serviceable boundary requires a replaceable gasket and post-service pressure test",
        quantity: 1,
        unitPrice: 4.50,
        supplier: "Mill-Max Manufacturing",
        partNumber: "0906-2-15-20-75-14-11-0",
        datasheet: "mill-max.com",
      },
      {
        name: "Ceramic Case Back w/ Sensor Windows",
        description: "Zirconia ceramic case back with optical windows for PPG/SpO2 sensors and thermal contact pad. Engraved with unique device ID and QR code",
        quantity: 1,
        unitPrice: 12.00,
        supplier: "Custom (CoorsTek)",
        partNumber: "NG-BACK-ZRO2",
        datasheet: "coorstek.com",
      },
    ],
  },
]

// Calculate totals
const calculateBOMTotal = () => {
  let total = 0
  billOfMaterials.forEach((category) => {
    category.items.forEach((item) => {
      total += item.quantity * item.unitPrice
    })
  })
  return total
}

const componentBOMTotal = calculateBOMTotal()
const assemblyLabor = 35.00
const qualityTesting = 25.00
const fdaCertification = 15.00
const packaging = 8.00
const naloxoneRefill = 42.00
const totalPerUnit = componentBOMTotal + assemblyLabor + qualityTesting + fdaCertification + packaging
const totalWithNaloxone = totalPerUnit + naloxoneRefill
const fundingGoal80Units = totalWithNaloxone * 80

const coreLayerMarginsMm2 = watchDesignCalculations.coreLayerMarginsMm2
const coreMinimumLayerMarginMm2 = Math.min(...coreLayerMarginsMm2)
const idealizedRuntimeHours = watchDesignCalculations.idealizedRuntimeHours
const componentCount = billOfMaterials.reduce((sum, category) => sum + category.items.length, 0)
const simulationPanels = [
  {
    label: "Sealed core fit",
    value: "Conditional",
    detail: `${watchDesignModel.coreLayers.length} layered planes; minimum ${coreMinimumLayerMarginMm2} mm² planar margin and ${watchDesignCalculations.coreThicknessMarginMm} mm modeled stack margin. Medication pod is separate.`,
  },
  {
    label: "Power margin",
    value: "Unverified",
    detail: "Harvesting and load figures are design targets, not measured data",
  },
  {
    label: "BOM integrity",
    value: `${componentCount} parts`,
    detail: `$${componentBOMTotal.toFixed(2)} candidate component subtotal before labor`,
  },
]

export default function NGWatchPage() {
  const goFundMeUrl = process.env.NEXT_PUBLIC_GOFUNDME_URL || "https://gofund.me/9acf270ea"
  const investorUrl = process.env.NEXT_PUBLIC_INVESTOR_CONTACT_URL || "mailto:narcoguard607@gmail.com?subject=NarcoGuard%20investment%20inquiry"
  const [rotation, setRotation] = useState({ x: -20, y: 30 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientY - rect.top) / rect.height - 0.5) * 60
    const y = ((e.clientX - rect.left) / rect.width - 0.5) * 60
    setRotation({ x: -x, y })
  }

  const watchComponents = [
    { id: "snapdragon", name: "Snapdragon W5+ SoC", x: 40, y: 38, color: "#FF4136", description: "Qualcomm SW5100 - quad-core 4nm processor running Wear OS with NarcoGuard custom firmware. 1.7GHz, Adreno 702 GPU." },
    { id: "nordic", name: "Nordic nRF5340 Co-Processor", x: 60, y: 38, color: "#FF851B", description: "Candidate low-power processing path; firmware power draw and clinical performance are unverified." },
    { id: "display", name: '1.45" LTPO AMOLED', x: 50, y: 50, color: "#FFDC00", description: "BOE 466x466 round display, 2000 nits, 1-120Hz adaptive. Always-on mode shows vitals without waking main processor." },
    { id: "ppg-ecg", name: "MAX86178 PPG+ECG+BioZ", x: 50, y: 78, color: "#FF69B4", description: "Tri-mode optical/electrical heart sensor. Continuous PPG, on-demand single-lead ECG, bioimpedance for body composition." },
    { id: "naloxone", name: "Auto-Injection Module", x: 85, y: 50, color: "#FF0000", description: "Faulhaber micro-motor + retractable 30G needle + 0.4ml naloxone cartridge. Deploys in within a future validated timing target. Snap-fit replaceable." },
    { id: "solar", name: "GaAs Solar Cell Ring", x: 50, y: 15, color: "#2ECC40", description: "Candidate solar concept; measured output and thermal integration are unverified." },
    { id: "kinetic", name: "Kinetic Rotor (Seiko-style)", x: 18, y: 50, color: "#B10DC9", description: "Candidate kinetic concept; measured output and mechanical integration are unverified." },
    { id: "thermo", name: "Thermoelectric Generator", x: 50, y: 85, color: "#FF6600", description: "Candidate thermoelectric concept; measured output and thermal path are unverified." },
    { id: "battery", name: "500mAh LiPo + Qi Charging", x: 15, y: 35, color: "#7FDBFF", description: "Candidate battery and single-input charger; source arbitration and safety design are not implemented." },
    { id: "cellular", name: "4G LTE + eSIM concept", x: 82, y: 28, color: "#39CCCC", description: "Candidate cellular architecture; carrier certification, antenna performance, eSIM provisioning, and standalone behavior are unverified." },
    { id: "gps", name: "Multi-constellation GNSS concept", x: 22, y: 22, color: "#01FF70", description: "Candidate GNSS path; accuracy and RF integration are unverified." },
    { id: "fingerprint", name: "Crown Fingerprint Sensor", x: 82, y: 72, color: "#AAAAAA", description: "Proposed biometric access-control concept; no implementation or security validation." },
    { id: "sealed-charge", name: "Sealed Qi / Service Boundary", x: 18, y: 72, color: "#FFFFFF", description: "No external charging opening; Qi charging and gasketed internal service access are design targets." },
    { id: "nfc", name: "NFC (Payments + ID)", x: 65, y: 18, color: "#0074D9", description: "STMicro ST54K - Google Pay, Apple Pay. Also stores encrypted emergency medical ID scannable by first responders." },
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleField count={80} />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="outline" className="glass neon-border bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold glow-text text-center">NG | NarcoGuard System Blueprint</h1>
          <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-500 hover:bg-green-600 text-black font-bold">
              <DollarSign className="w-4 h-4 mr-2" />
              Fund This
            </Button>
          </a>
        </header>

        {/* Hero Product Showcase with New Images */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden neon-border">
            <Image src="/images/ng-modular-exploded.jpg" alt="NarcoGuard NG concept exploded view showing candidate modular components" width={1200} height={675} className="w-full h-auto object-cover" />
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
              <h3 className="font-bold text-lg mb-4">State-of-the-Art Candidate Parts</h3>
              <div className="space-y-3 text-sm">
                {[
                  ["Compute", "Qualcomm SW5100", "Snapdragon W5+ Gen 1"],
                  ["Health MCU", "NRF5340-QKAA-R7", "Nordic nRF5340"],
                  ["Vitals AFE", "MAX86178", "Analog Devices / Maxim"],
                  ["Motion", "LSM6DSO32XTR", "STMicroelectronics"],
                  ["GNSS", "BCM47765", "Broadcom dual-band L1/L5"],
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

        {/* Anti-Theft / Biometric Lock Callout */}
        <section className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <Lock className="w-6 h-6 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-300">Proposed Biometric Access Control (Unverified)</h3>
              <p className="text-sm text-muted-foreground mt-1">A proposed biometric access-control concept is shown for research discussion only. No fingerprint lock, tamper detection, factory-reset restriction, or alerting behavior is implemented or validated.</p>
            </div>
          </div>
        </section>

        {/* Funding CTA */}
        <section className="mb-8 p-6 rounded-2xl neon-border bg-gradient-to-r from-green-500/20 via-primary/10 to-green-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-balance">80 Watches for Field Evaluation</h2>
              <p className="text-muted-foreground mt-1">Each NarcoGuard NG costs <span className="text-green-400 font-bold">${totalWithNaloxone.toFixed(2)}</span> in the current candidate BOM model. Total planning goal: <span className="text-green-400 font-bold">${fundingGoal80Units.toFixed(2)}</span></p>
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

        <Tabs defaultValue="blueprint" className="space-y-6">
          <TabsList className="grid grid-cols-4 glass neon-border">
            <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
            <TabsTrigger value="3d-view">3D View</TabsTrigger>
            <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
            <TabsTrigger value="specs">Full Specifications</TabsTrigger>
          </TabsList>

          {/* Interactive Blueprint - DEFAULT TAB */}
          <TabsContent value="blueprint">
            <HolographicCard className="p-6" glowIntensity="medium">
              <h2 className="text-xl font-bold mb-2 text-center">Interactive Component Map - NarcoGuard NG Rev 4.2</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">Click any component to see commercially available candidate part details and supplier information</p>

              <div className="relative aspect-square max-w-2xl mx-auto bg-gradient-to-br from-zinc-900 to-background rounded-full neon-border overflow-hidden">
                <div className="absolute inset-0 opacity-35">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18)_0,rgba(56,189,248,0.08)_20%,transparent_21%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(148,163,184,0.22)_50%,transparent_51%),linear-gradient(transparent_49%,rgba(148,163,184,0.22)_50%,transparent_51%)] bg-[length:22px_22px]" />
                </div>
                <div className="absolute inset-6 rounded-full border-2 border-zinc-700" />
                <div className="absolute inset-12 rounded-full border border-zinc-800" />
                <div className="absolute inset-[4.5rem] rounded-full border border-zinc-800/50" />
                <div className="absolute inset-[7rem] rounded-full border border-primary/20" />
                <div className="absolute left-1/2 top-1/2 h-[86%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                <div className="absolute left-1/2 top-1/2 h-px w-[86%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="absolute right-4 top-4 rounded-lg border border-border/60 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Read order: 1 → 15
                </div>
                <div className="absolute left-4 bottom-4 max-w-[16rem] rounded-lg border border-border/60 bg-black/40 p-3 text-[10px] leading-relaxed text-muted-foreground">
                  Engineering note: all dimensions shown here are concept targets. Final tooling requires tolerance stack-up, thermal soak, enclosure validation, and bench verification against real parts.
                </div>

                {watchComponents.map((comp, index) => (
                  <button
                    key={comp.id}
                    className={`absolute w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125 ${
                      selectedComponent === comp.id ? "ring-4 ring-white scale-125 z-20" : "z-10"
                    }`}
                    style={{
                      left: `${comp.x}%`,
                      top: `${comp.y}%`,
                      transform: "translate(-50%, -50%)",
                      backgroundColor: comp.color,
                      boxShadow: `0 0 20px ${comp.color}80`,
                    }}
                    onClick={() => setSelectedComponent(selectedComponent === comp.id ? null : comp.id)}
                  >
                    <span className="text-sm font-bold text-black drop-shadow-sm">{index + 1}</span>
                  </button>
                ))}

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-bold glow-text">NarcoGuard NG</p>
                    <p className="text-[10px] text-muted-foreground">REV 4.2</p>
                    <p className="text-[10px] text-primary/80 mt-2 max-w-[14rem]">Kalman-filtered vitals, confidence-weighted fusion, and persistence gating reduce noise before any emergency action.</p>
                  </div>
                </div>
              </div>

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
                  <p className="mt-1 text-sm text-muted-foreground">Layered core minimum: {coreMinimumLayerMarginMm2} mm² planar margin; modeled stack margin: {watchDesignCalculations.coreThicknessMarginMm} mm. CAD interference and tolerances remain required.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Power balance</p>
                  <p className="mt-1 text-sm text-muted-foreground">Harvesting and load balance are unverified until measured on a populated prototype.</p>
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
                  Interactive 3D Model
                </h2>

                <div
                  ref={containerRef}
                  className="relative aspect-square bg-gradient-to-br from-background to-primary/10 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing neon-border"
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                  onMouseMove={handleMouseMove}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
                    style={{
                      transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div className="relative w-64 h-64">
                      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-2xl neon-border" style={{ transform: "translateZ(20px)" }}>
                        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden">
                          <div className="text-center">
                            <Heart className="w-8 h-8 text-red-500 mx-auto heartbeat" />
                            <p className="text-2xl font-bold mt-2">DATA UNAVAILABLE</p>
                            <p className="text-xs text-muted-foreground">Concept UI — no watch connected</p>
                            <p className="text-[10px] text-amber-300 mt-1">NOT A LIVE MEASUREMENT</p>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent animate-pulse" />
                        </div>
                      </div>
                      {/* Solar ring */}
                      <div className="absolute inset-2 rounded-full border-4 border-green-500/40" style={{ transform: "translateZ(22px)" }} />
                      {/* Naloxone cartridge */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-16 bg-gradient-to-r from-red-700 to-red-500 rounded-r-lg pulse-glow" style={{ transform: "translateZ(25px) translateX(10px)" }}>
                        <Syringe className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
                      </div>
                      {/* Crown with fingerprint */}
                      <div className="absolute right-0 top-1/3 w-4 h-10 bg-gradient-to-r from-zinc-600 to-zinc-400 rounded-r flex items-center justify-center" style={{ transform: "translateZ(15px) translateX(6px)" }}>
                        <Fingerprint className="w-3 h-3 text-zinc-800" />
                      </div>
                      {/* Sealed service boundary: no external charging opening */}
                      <div className="absolute left-0 top-2/3 w-3 h-5 rounded-l border border-zinc-400/70 bg-zinc-700" style={{ transform: "translateZ(15px) translateX(-4px)" }}>
                        <Lock className="w-2 h-2 text-zinc-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div className="absolute inset-[4.5rem] rounded-full border-2 border-purple-500/30 animate-spin" style={{ transform: "translateZ(8px)", animationDuration: "8s" }} />
                      {/* Straps */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-zinc-800 rounded-t-lg" style={{ transform: "translateZ(10px) translateY(-10px)" }} />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-zinc-800 rounded-b-lg" style={{ transform: "translateZ(10px) translateY(10px)" }} />
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <Button size="sm" variant="outline" className="glass bg-transparent" onClick={() => setRotation({ x: -20, y: 30 })}><RotateCcw className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" className="glass bg-transparent" onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}><ZoomIn className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" className="glass bg-transparent" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}><ZoomOut className="w-4 h-4" /></Button>
                  </div>
                  <p className="absolute bottom-4 right-4 text-xs text-muted-foreground">Drag to rotate</p>
                </div>
              </HolographicCard>

              <div className="space-y-4">
                <HolographicCard className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    Key Differentiators vs. Apple/Fitbit/Garmin
                  </h3>
                  <div className="space-y-3">
                    {[
                      { icon: Syringe, color: "text-red-500", title: "Proposed Naloxone Delivery", desc: "No production watch currently offers this validated capability" },
                      { icon: Fingerprint, color: "text-amber-400", title: "Proposed Access Control", desc: "Research concept; not implemented or security-validated" },
                      { icon: Sun, color: "text-green-500", title: "Candidate Power Sources", desc: "Harvesting and battery life require measured prototype data" },
                      { icon: Cog, color: "text-purple-400", title: "Fully Modular", desc: "Modules are replaceable only through a controlled service procedure; every opened seal requires replacement and pressure retest." },
                      { icon: Heart, color: "text-pink-500", title: "Candidate Sensors", desc: "PPG + ECG + BioZ + EDA + skin temperature; accuracy unverified" },
                      { icon: Cpu, color: "text-blue-400", title: "Candidate Processing", desc: "Wearable compute architecture; firmware and clinical performance unverified" },
                      { icon: Thermometer, color: "text-orange-400", title: "Thermoelectric Concept", desc: "Output depends on thermal path and must be measured" },
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

                <HolographicCard className="p-6 bg-gradient-to-r from-green-500/10 to-primary/10">
                  <h3 className="font-bold text-lg mb-2">Unit Cost Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Components ({billOfMaterials.reduce((n, c) => n + c.items.length, 0)} parts)</span><span className="font-mono">${componentBOMTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Assembly Labor</span><span className="font-mono">${assemblyLabor.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>QA/Testing (10-point)</span><span className="font-mono">${qualityTesting.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>FDA/CE Certification</span><span className="font-mono">${fdaCertification.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Packaging + Charger</span><span className="font-mono">${packaging.toFixed(2)}</span></div>
                    <div className="border-t border-primary/30 pt-2 flex justify-between font-bold">
                      <span>Hardware Total</span>
                      <span className="font-mono text-primary">${totalPerUnit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>+ Naloxone Cartridge (0.4mg)</span>
                      <span className="font-mono">${naloxoneRefill.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-primary/30 pt-2 flex justify-between font-bold text-lg">
                      <span>Complete Unit</span>
                      <span className="font-mono text-green-500">${totalWithNaloxone.toFixed(2)}</span>
                    </div>
                    <div className="mt-3 p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">80 units for Broome County pilot</p>
                      <p className="text-xl font-bold text-green-400">${fundingGoal80Units.toFixed(2)}</p>
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
              <HolographicCard className="p-6 bg-gradient-to-r from-green-500/20 to-primary/20" glowIntensity="high">
                <h3 className="text-xl font-bold mb-4">Prototype Cost Summary - NarcoGuard NG</h3>
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
                    <p className="text-xs text-muted-foreground">QA + FDA</p>
                    <p className="text-xl font-bold font-mono">${(qualityTesting + fdaCertification).toFixed(2)}</p>
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
                  <h4 className="font-bold mb-2">Funding Goal: 80 Watches for Broome County Pilot</h4>
                  <div className="flex items-center justify-between">
                    <span>80 units x ${totalWithNaloxone.toFixed(2)}</span>
                    <span className="text-2xl font-bold text-green-500">${fundingGoal80Units.toFixed(2)}</span>
                  </div>
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
          <TabsContent value="specs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: Cpu, color: "text-primary", title: "Processing & Memory",
                  specs: [
                    ["Primary SoC", "Qualcomm Snapdragon W5+ Gen 1 (4nm)"],
                    ["CPU", "Quad-core Cortex-A53 @ 1.7GHz"],
                    ["GPU", "Adreno 702"],
                    ["Co-Processor", "Nordic nRF5340 (always-on health AI)"],
                    ["RAM", "2GB LPDDR4X"],
                    ["Storage", "4GB NAND Flash"],
                    ["OS", "Wear OS 5 + NarcoGuard Custom Firmware"],
                  ]
                },
                {
                  icon: Heart, color: "text-red-500", title: "Health Sensors ( candidate)",
                  specs: [
                    ["Optical PPG", "Maxim MAX86178 multi-wavelength, +/-1 BPM"],
                    ["ECG", "Single-lead electrocardiogram (on-demand)"],
                    ["SpO2", "Continuous blood oxygen, +/-2%"],
                    ["BioZ", "Body impedance analysis (hydration, composition)"],
                    ["Skin Temperature", "Melexis MLX90632 IR, +/-0.1C"],
                    ["EDA/GSR", "ams AS7038RB electrodermal activity (stress)"],
                    ["Motion", "STMicro LSM6DSO32X 6-axis IMU (32g)"],
                    ["Compass", "STMicro LIS2MDL 3-axis magnetometer"],
                    ["Barometer", "Bosch BMP390 (altitude, weather)"],
                    ["Fall Detection", "AI-based impact + orientation analysis"],
                  ]
                },
                {
                  icon: Wifi, color: "text-cyan-400", title: "Connectivity",
                  specs: [
                    ["Cellular", "Qualcomm SDX35 4G LTE candidate; integration unverified"],
                    ["eSIM", "Thales ELS62T1 eUICC candidate; carrier support unverified"],
                    ["Wi-Fi", "Infineon CYW43022 candidate; Wi-Fi standard and RF integration unverified"],
                    ["Bluetooth", "5.3 LE + BLE Audio (LE Audio codec)"],
                    ["GNSS", "Broadcom BCM47765 L1+L5 dual-band"],
                    ["NFC", "STMicro ST54K (payments + emergency ID)"],
                    ["UWB", "Taoglas FXP840 - precise indoor positioning"],
                  ]
                },
                {
                  icon: Battery, color: "text-green-500", title: "Candidate Sealed Power System",
                  specs: [
                    ["Battery", "500mAh battery candidate; exact cell, protection, and certification unverified"],
                    ["Battery Life", "Runtime unverified; energy-harvesting and battery tests required"],
                    ["Solar", "Candidate GaAs solar source; output unverified"],
                    ["Kinetic", "Candidate kinetic source; output unverified"],
                    ["Thermoelectric", "Candidate thermoelectric source; output unverified"],
                    ["Wireless Charging", "Qi (TI BQ51013B, 5W)"],
                    ["Charging boundary", "No external USB-C port; sealed Qi charging target"],
                    ["Emergency Reserve", "6-hour low-power mode"],
                  ]
                },
                {
                  icon: Syringe, color: "text-red-500", title: "Naloxone Auto-Injection",
                  specs: [
                    ["Motor", "Faulhaber 0206B coreless micro DC motor"],
                    ["Needle", "30-gauge 316L stainless, retractable"],
                    ["Penetration Depth", "4mm subcutaneous"],
                    ["Dosage", "0.4mg naloxone hydrochloride"],
                    ["Deployment Speed", "< 3 seconds from trigger"],
                    ["Cartridge Life", "Shelf life and storage require validated sterile packaging and stability data"],
                    ["Replacement", "Snap-fit modular. Tool-free swap"],
                    ["Trigger", "Automatic (vitals AI) or manual SOS"],
                    ["Valve", "Takasago SMVT 0.5ms micro solenoid"],
                    ["Voice Alert", "Epson S1V30340 speech synth IC"],
                  ]
                },
                {
                  icon: Smartphone, color: "text-blue-500", title: "Display, Audio & Haptics",
                  specs: [
                    ["Display", '1.45" BOE LTPO AMOLED 466x466 (326 PPI)'],
                    ["Brightness", "2000 nits peak (outdoor readable)"],
                    ["Refresh Rate", "1-120Hz adaptive (LTPO)"],
                    ["Always-On", "Yes, 1Hz AOD mode"],
                    ["Glass", "Lab-grown sapphire crystal (9H)"],
                    ["Touch", "Capacitive with wet-finger + glove mode"],
                    ["Speaker", "AAC ACAM3825 candidate; acoustic output unverified"],
                    ["Microphone", "Knowles SPH0645 MEMS + ANC"],
                    ["Haptics", "TDK PowerHap 1204H piezoelectric"],
                  ]
                },
                {
                  icon: Shield, color: "text-amber-400", title: "Physical & Durability",
                  specs: [
                    ["Case", "Grade 5 Titanium (Ti-6Al-4V) + PVD"],
                    ["Back", "Zirconia ceramic with sensor windows"],
                    ["Dimensions", "46mm x 46mm x 14.2mm"],
                    ["Weight", "74g (with cartridge and strap)"],
                    ["Water Rating", "Target IP68/ISO 22810; qualification unverified"],
                    ["Temp Range", "-20C to +55C operating"],
                    ["Strap", "22mm quick-release candidate silicone; biocompatibility and ingress effects unverified"],
                    ["Gaskets", "Parker Viton fluoroelastomer"],
                    ["Modular Parts", "Battery, cartridge, strap, glass; service seals require post-service pressure testing"],
                  ]
                },
                {
                  icon: Lock, color: "text-amber-400", title: "Security & Anti-Theft",
                  specs: [
                    ["Fingerprint", "Goodix GH3220 in crown button"],
                    ["Biometric Lock", "Owner-only unlock, cannot be reset"],
                    ["Tamper Detection", "Alerts on unauthorized removal"],
                    ["Encryption", "AES-256 for health data at rest"],
                    ["HIPAA", "Compliant data handling"],
                    ["Kill Switch", "Remote wipe via Find My Watch"],
                    ["Device ID", "Unique engraved + digital certificate"],
                    ["Activation Lock", "Tied to NarcoGuard account forever"],
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
