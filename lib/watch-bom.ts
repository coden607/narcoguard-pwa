// Copyright (c) 2026 Stephen Blanford / NarcoGuard. All rights reserved. Not licensed under MIT.
//
// Public concept bill of materials. Orderable part numbers, land patterns and
// manufacturing files are not published here. This is not a medical-device BOM.
export interface BomItem {
  name: string
  description: string
  quantity: number
  unitPrice: number
  supplier: string
  partNumber: string
  datasheet: string
}

export interface BomCategory {
  category: string
  description: string
  items: BomItem[]
}

export const BOM_46: BomCategory[] = [
  {
    category: "Main Processing Unit",
    description: "Main Wear OS platform plus an independent safety microcontroller",
    items: [
      {
        name: "Qualcomm Snapdragon W5+ Gen 2",
        description: "Current Qualcomm wearable platform (announced Aug 2025): 4nm SoC with always-on co-processor, Wear OS support, Location ML 3.0 GNSS and Skylo NB-NTN satellite emergency messaging. Requires a Qualcomm customer agreement; price is an estimate.",
        quantity: 1,
        unitPrice: 26.00,
        supplier: "Qualcomm",
        partNumber: "W5+ Gen 2 (confirm SKU with Qualcomm)",
        datasheet: "qualcomm.com/wearables",
      },
      {
        name: "Safety microcontroller",
        description: "Independent low-power microcontroller that keeps sensor sampling and local alarms running if the main OS crashes or reboots. Algorithms on it are unvalidated.",
        quantity: 1,
        unitPrice: 8.50,
        supplier: "Nordic Semiconductor",
        partNumber: "safety MCU (private hardware package)",
        datasheet: "nordicsemi.com",
      },
      {
        name: "32 GB eMMC 5.1 storage",
        description: "Storage for Wear OS, apps and on-device logs. Wear OS needs far more than the 4 Gbit (512 MB) SPI NAND previously listed. Vendor (Samsung, Kioxia or Micron) to be selected by quote.",
        quantity: 1,
        unitPrice: 6.00,
        supplier: "Samsung / Kioxia / Micron (TBD)",
        partNumber: "TBD (32 GB eMMC 5.1)",
        datasheet: "jedec.org (eMMC 5.1)",
      },
      {
        name: "2 GB low-power memory",
        description: "Memory for the wearable module. The exact chip stays in the private hardware package.",
        quantity: 1,
        unitPrice: 5.80,
        supplier: "Micron Technology",
        partNumber: "private hardware package",
        datasheet: "micron.com",
      },
    ],
  },
  {
    category: "Health Sensors (Candidate)",
    description: "Candidate sensor array for research; accuracy and overdose-detection performance are unverified",
    items: [
      {
        name: "Analog Devices MAX86178",
        description: "Optical PPG + ECG + bioimpedance analog front end: heart rate, SpO2 estimate, single-lead ECG and skin-contact detection. Wrist SpO2 accuracy, especially across skin tones, must be validated.",
        quantity: 1,
        unitPrice: 12.50,
        supplier: "Analog Devices (Maxim)",
        partNumber: "MAX86178",
        datasheet: "analog.com/MAX86178",
      },
      {
        name: "Barometric pressure sensor",
        description: "Barometric pressure sensor for altimeter, elevation tracking, weather. Needs a sealed vent.",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Bosch Sensortec class",
        partNumber: "private hardware package",
        datasheet: "bosch-sensortec.com",
      },
      {
        name: "6-axis IMU",
        description: "Accelerometer and gyroscope for motion, falls, sleep and motion-artifact rejection. High-g sensing is a research target.",
        quantity: 1,
        unitPrice: 4.20,
        supplier: "STMicroelectronics class",
        partNumber: "private hardware package",
        datasheet: "st.com",
      },
      {
        name: "STMicro LIS2MDL",
        description: "3-axis magnetometer/compass for navigation and GPS assist",
        quantity: 1,
        unitPrice: 1.80,
        supplier: "STMicroelectronics",
        partNumber: "private hardware package",
        datasheet: "st.com/LIS2MDL",
      },
      {
        name: "Melexis MLX90632",
        description: "candidate non-contact infrared skin-temperature sensor; accuracy depends on the selected variant and requires validation",
        quantity: 1,
        unitPrice: 6.50,
        supplier: "Melexis",
        partNumber: "private hardware package",
        datasheet: "melexis.com",
      },
      {
        name: "ams-OSRAM AS7038RB",
        description: "Candidate secondary biosensor front end for electrodermal/stress research; confirm feature set and long-term availability before committing",
        quantity: 1,
        unitPrice: 3.90,
        supplier: "ams-OSRAM",
        partNumber: "private hardware package",
        datasheet: "ams-osram.com",
      },
    ],
  },
  {
    category: "Connectivity (5G RedCap + eSIM + satellite SOS)",
    description: "Candidate standalone connectivity; carrier and RF integration are unverified",
    items: [
      {
        name: "Qualcomm Snapdragon X35 (SDX35) 5G RedCap modem",
        description: "5G NR-Light (RedCap) modem with LTE Cat 4 fallback and L1+L5 GNSS, designed for wearables. Carrier certification, antenna design and power budget unverified.",
        quantity: 1,
        unitPrice: 18.00,
        supplier: "Qualcomm",
        partNumber: "SDX35",
        datasheet: "qualcomm.com (Snapdragon X35 product brief)",
      },
      {
        name: "STMicro ST54K NFC Controller",
        description: "NFC for an emergency medical-ID tap and pairing. Contactless payments would need Google Wallet certification; Apple Pay is not available on non-Apple watches.",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "STMicroelectronics",
        partNumber: "ST54K",
        datasheet: "st.com/ST54",
      },
      {
        name: "Embedded SIM (eUICC)",
        description: "Embedded SIM for standalone cellular with remote carrier provisioning (GSMA). Replaces the previously listed Thales ELS62, which is a separate LTE module, not an eSIM.",
        quantity: 1,
        unitPrice: 2.50,
        supplier: "STMicroelectronics",
        partNumber: "private hardware package",
        datasheet: "st.com/ST4SIM",
      },
      {
        name: "Cellular/GNSS/Wi-Fi antenna set (custom)",
        description: "Antennas co-designed with the titanium case (for example by Taoglas or Ignion); a metal case needs dedicated antenna slots or a ceramic/sapphire window",
        quantity: 1,
        unitPrice: 3.20,
        supplier: "Taoglas / Ignion (TBD)",
        partNumber: "TBD (custom)",
        datasheet: "taoglas.com",
      },
    ],
  },
  {
    category: "Sealed Power System (battery + Qi)",
    description: "Protected cell with sealed Qi charging. Light and motion harvesting are supplemental and are not claimed to run the watch.",
    items: [
      {
        name: "~250 mAh (estimated) certified protected lithium polymer pouch cell",
        description: "Volume estimate pending cell selection. Certified protected lithium polymer pouch cell with protection circuit; must hold IEC 62133-2 and UN38.3 certification. ~0.93 Wh (estimated) at 3.7V. Supplier (e.g. ATL, Amperex, or other wearable-cell maker) to be quoted.",
        quantity: 1,
        unitPrice: 8.50,
        supplier: "Qualified wearable-cell supplier (TBD)",
        partNumber: "TBD (~250 mAh, estimated)",
        datasheet: "iec.ch (IEC 62133-2)",
      },
      {
        name: "Qi receiver IC",
        description: "Qi-compatible wireless charging receiver IC, 5W input",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Texas Instruments",
        partNumber: "private hardware package",
        datasheet: "ti.com",
      },
      {
        name: "Qi receive coil",
        description: "Wireless charging receive coil, 20mm diameter",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Wurth Elektronik",
        partNumber: "private hardware package",
        datasheet: "we-online.com",
      },
      {
        name: "Texas Instruments BQ25619",
        description: "Single-cell charger with power path and low quiescent current, fed by the Qi receiver",
        quantity: 1,
        unitPrice: 3.50,
        supplier: "Texas Instruments",
        partNumber: "private hardware package",
        datasheet: "ti.com/BQ25619",
      },
    ],
  },
  {
    category: "Display, Audio & Haptics",
    description: "Candidate display, audio, and haptic modules; brightness, acoustics, ingress, and reliability require qualification",
    items: [
      {
        name: "1.4–1.5 in round LTPO AMOLED module",
        description: "Round always-on-capable AMOLED with touch; resolution, brightness and price from a supplier quote (e.g. BOE, Samsung Display)",
        quantity: 1,
        unitPrice: 32.00,
        supplier: "BOE / Samsung Display (TBD)",
        partNumber: "TBD (quote)",
        datasheet: "boe.com",
      },
      {
        name: "MEMS microphone",
        description: "Microphone for voice input, behind a membrane vent. The exact microphone stays in the private hardware package.",
        quantity: 1,
        unitPrice: 1.50,
        supplier: "Knowles Corporation",
        partNumber: "private hardware package",
        datasheet: "knowles.com",
      },
      {
        name: "Micro speaker (sealed, wearable-grade)",
        description: "Waterproof micro speaker for alarms and voice; part selected after measuring alarm loudness in the enclosure",
        quantity: 1,
        unitPrice: 2.20,
        supplier: "AAC Technologies / Knowles (TBD)",
        partNumber: "TBD",
        datasheet: "aactechnologies.com",
      },
      {
        name: "Piezo haptic actuator",
        description: "Piezoelectric haptic actuator for distinct alert vibration patterns",
        quantity: 1,
        unitPrice: 3.80,
        supplier: "TDK Corporation",
        partNumber: "private hardware package",
        datasheet: "tdk.com",
      },
    ],
  },
  {
    category: "Modular Auto-Injector Research Pod (future pathway)",
    description: "Separate removable research module only. No NarcoGuard watch currently injects naloxone. Delivery mechanism, drug container, dose, activation logic, clinical requirements, supplier pricing, and regulatory pathway remain unfinalized.",
    items: [
      {
        name: "Removable medical-module enclosure (research placeholder)",
        description: "Mechanical envelope and isolated service boundary only. Final geometry, seals, materials, human-factors constraints, and attachment method require dedicated medical-device engineering.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Medical-device engineering partner (TBD)",
        partNumber: "NG-AUTO-INJECTOR-R5-CONCEPT",
        datasheet: "TBD",
      },
      {
        name: "Drug-delivery mechanism (not specified)",
        description: "No needle, insertion mechanism, actuator, force, speed, or dose is specified in the public Rev 5 BOM. Those parameters require clinical, pharmaceutical, human-factors, and regulatory work.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Licensed medical-device partner (TBD)",
        partNumber: "TBD after clinical requirements",
        datasheet: "TBD",
      },
      {
        name: "Pharmaceutical cartridge interface (not specified)",
        description: "Future drug-container interface must come from a licensed pharmaceutical/combination-product pathway with stability, sterility, shelf-life, tamper, and service controls. No current cartridge is selected.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Licensed pharmaceutical partner (TBD)",
        partNumber: "TBD",
        datasheet: "TBD",
      },
    ],
  },
  {
    category: "Rev 5 Energy Harvesting & Safety Reserve (research)",
    description: "Supplemental harvesting only. Qi and the protected Li-ion cell remain primary. Generator, PV and TEG output must be measured before any runtime claim.",
    items: [
      {
        name: "Manual crown microgenerator",
        description: "Custom sealed magnet/coil generator coupled to crown rotation for emergency reserve charging. Mechanical torque, output, sealing and cycle life are unverified.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Custom micromechatronics vendor (TBD)",
        partNumber: "NG-CROWN-GEN-R5 (concept)",
        datasheet: "TBD",
      },
      {
        name: "Analog Devices ADP5091 energy-harvesting PMU",
        description: "Ultralow-power MPPT harvester candidate for the photovoltaic ring and the rectified crown. Body-heat thermoelectric input is not fitted. Cold-start behavior requires bench validation.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Analog Devices",
        partNumber: "private hardware package",
        datasheet: "analog.com/ADP5091",
      },
      {
        name: "Second kinetic harvester IC (not fitted)",
        description: "Reviewed and not used. The baseline keeps one harvesting PMIC for the photovoltaic ring and the crown. A second chip is not in the sealed layout.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Analog Devices",
        partNumber: "not fitted",
        datasheet: "analog.com/LTC3331",
      },
      {
        name: "Segmented photovoltaic bezel ring",
        description: "Custom small-area PV segments around an optically exposed bezel/crystal region. Supplemental trickle energy only; antenna and display effects must be measured.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Custom PV vendor (TBD)",
        partNumber: "NG-PV-RING-R5 (concept)",
        datasheet: "TBD",
      },
      {
        name: "Thermoelectric harvester (not fitted)",
        description: "Reviewed and not fitted. A useful body-heat generator needs more thickness than the sealed case back can give, and that face is already the sensor windows and the Qi coil.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Custom TEG vendor (TBD)",
        partNumber: "NG-TEG-R5 (concept)",
        datasheet: "TBD",
      },
      {
        name: "Automatic electrical rotor generator",
        description: "Experimental annular/eccentric self-winding electrical generator. Packaging is more credible in NG46 and high risk in NG40; include only if measured energy return justifies mass, thickness, bearings and reliability cost.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Custom microgenerator vendor (TBD)",
        partNumber: "NG-AUTO-ROTOR-R5 (concept)",
        datasheet: "TBD",
      },
      {
        name: "Emergency supercapacitor reserve",
        description: "Low-profile reserve storage isolated from main Wear OS loads for the nRF5340 safety MCU, local alarm and a measured emergency communication budget.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Panasonic / Eaton / CAP-XX / equivalent (TBD)",
        partNumber: "TBD after SOS energy measurement",
        datasheet: "TBD",
      },
    ],
  },
  {
    category: "Rev 5 Camera & Privacy Hardware (research)",
    description: "User-initiated camera only. Off by default; not part of overdose detection and not intended for background surveillance.",
    items: [
      {
        name: "OMNIVISION CameraCubeChip miniature camera",
        description: "OVM7692-class wafer-level camera candidate with MIPI support for user-started calls, QR/document capture and explicitly shared emergency context. Final sensor may change after package, image-quality and power evaluation.",
        quantity: 1,
        unitPrice: 0,
        supplier: "OMNIVISION",
        partNumber: "OVM7692-class candidate",
        datasheet: "ovt.com",
      },
      {
        name: "Mechanical camera privacy shutter",
        description: "Physical lens blocker with positive open/closed positions. Camera-dependent features must fail safely when closed.",
        quantity: 1,
        unitPrice: 0,
        supplier: "Custom",
        partNumber: "NG-CAM-SHUTTER-R5",
        datasheet: "TBD",
      },
      {
        name: "Camera hard power gate + privacy indicator",
        description: "Hardware sensor power switch plus indicator LED tied to the camera power rail so software cannot intentionally image while leaving the indicator unpowered.",
        quantity: 1,
        unitPrice: 0,
        supplier: "TBD",
        partNumber: "NG-CAM-PRIVACY-R5",
        datasheet: "TBD",
      },
    ],
  },
  {
    category: "Enclosure, Strap & Modular Assembly",
    description: "Titanium case with controlled-service modules; ingress, durability and skin-contact qualification required",
    items: [
      {
        name: "Grade 5 Titanium (Ti-6Al-4V) Case",
        description: "Candidate CNC Ti-6Al-4V enclosure; coating, ingress protection, pressure rating, and thermal/mechanical performance require qualification",
        quantity: 1,
        unitPrice: 38.00,
        supplier: "Custom CNC (Foxconn Interconnect)",
        partNumber: "NG-CASE-TI6AL4V-R5",
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
        name: "Titanium solar-inlay link bracelet",
        description: "Candidate premium solid titanium link bracelet with solar cells integrated into the band, 22 mm lug interface; men's finishes are silver or natural titanium. Clasp, finish, solar-cell integration, biocompatibility, and ingress effects require qualification. Unit price is an unquoted placeholder pending a supplier quote.",
        quantity: 1,
        unitPrice: 6.00,
        supplier: "Custom (TBD)",
        partNumber: "NG-BAND-TI-SOLAR-22MM",
        datasheet: "N/A - Custom",
      },
      {
        name: "8-layer HDI carrier assembly",
        description: "8-layer 1+6+1 HDI safety and core carrier. The wearable compute module is a separate board. Not a released Gerber set.",
        quantity: 1,
        unitPrice: 28.00,
        supplier: "JLCPCB / PCBWay",
        partNumber: "46 mm carrier",
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
        partNumber: "private hardware package",
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

/** Per-unit costs added to the component subtotal; the same for both sizes. */
export const UNIT_COSTS = {
  assemblyLabor: 35.0,
  qualityTesting: 25.0,
  complianceTesting: 15.0,
  packaging: 8.0,
  naloxoneRefill: 42.0,
} as const

function replace(bom: BomCategory[], changes: Record<string, Partial<BomItem>>) {
  const names = new Set(bom.flatMap((category) => category.items.map((item) => item.name)))
  for (const name of Object.keys(changes)) if (!names.has(name)) throw new Error(`BOM item not found: ${name}`)
  return bom.map((category) => ({
    ...category,
    items: category.items.map((item) => ({ ...item, ...changes[item.name] })),
  }))
}

/**
 * NG 40 mm: the same chips, sensors, radios and safety functions as the 46 mm, with the parts that
 * have to change for a smaller case and a smaller wrist. Prices are estimates pending quotes.
 */
export const BOM_40: BomCategory[] = replace(BOM_46, {
  "Cellular/GNSS/Wi-Fi antenna set (custom)": {
    description: "Antennas co-designed with the smaller 40 mm titanium case; shorter radiators make cellular and GNSS performance harder, so RF testing decides whether a ceramic window is needed",
    partNumber: "TBD (custom, 40 mm)",
  },
  "~250 mAh (estimated) certified protected lithium polymer pouch cell": {
    name: "~120 mAh (estimated) certified protected lithium polymer pouch cell",
    description: "Smaller certified protected lithium polymer pouch cell; volume estimate pending cell selection, with protection circuit; must hold IEC 62133-2 and UN38.3 certification. ~0.44 Wh (estimated) at 3.7V. Runtime will be shorter than the 46 mm and must be measured.",
    unitPrice: 7.0,
    partNumber: "TBD (~120 mAh, estimated)",
  },
  "Qi receive coil": {
    name: "Qi receiver coil, about 25 mm (TBD)",
    description: "Smaller wireless-charging receive coil to fit the 40 mm case back; catalogue or custom part chosen after coupling tests with the charger",
    supplier: "Wurth Elektronik / TDK (TBD)",
    partNumber: "TBD (about 15–25 mm)",
    datasheet: "we-online.com",
  },
  "1.4–1.5 in round LTPO AMOLED module": {
    name: "1.2 in round AMOLED module",
    description: "Round always-on-capable AMOLED with touch, about 396×396, the size class used on 40 mm watches; resolution, brightness and price from a supplier quote",
    unitPrice: 26.0,
  },
  "Grade 5 Titanium (Ti-6Al-4V) Case": {
    name: "Grade 5 Titanium (Ti-6Al-4V) Case, 40 mm",
    description: "Candidate CNC Ti-6Al-4V enclosure, 40 mm across and about 12.2 mm thick, for smaller wrists; coating, ingress protection and thermal/mechanical performance require qualification",
    unitPrice: 33.0,
    partNumber: "NG-CASE-TI6AL4V-40",
  },
  "Sapphire Crystal Watch Glass": {
    description: "Lab-grown sapphire with multi-layer AR coating, about 36 mm across and 0.8 mm thick for the 40 mm case; drop testing must confirm the thinner stack",
    unitPrice: 13.0,
    partNumber: "NG-SAP-40-08 (quote)",
  },
  "Titanium solar-inlay link bracelet": {
    description: "Candidate premium solid titanium link bracelet with solar cells integrated into the band, 20 mm lug interface for smaller wrists; women's finish is rose gold titanium. Clasp, finish, solar-cell integration, biocompatibility, and ingress effects require qualification. Unit price is an unquoted placeholder pending a supplier quote.",
    partNumber: "NG-BAND-TI-SOLAR-20MM",
  },
  "8-layer HDI carrier assembly": {
    description: "Smaller 8-layer 1+6+1 HDI carrier for the 40 mm case. A separate fabrication from the 46 mm board. Not a released Gerber set.",
    partNumber: "40 mm carrier",
  },
  "Ceramic Case Back w/ Sensor Windows": {
    description: "Zirconia ceramic case back sized for the 40 mm case, with optical windows for PPG/SpO2 sensors and the device ID and QR code",
    unitPrice: 10.0,
    partNumber: "NG-BACK-ZRO2-40",
  },
})

export function bomTotals(bom: BomCategory[]) {
  const components = bom.reduce((sum, category) => sum + category.items.reduce((n, item) => n + item.quantity * item.unitPrice, 0), 0)
  const hardware = components + UNIT_COSTS.assemblyLabor + UNIT_COSTS.qualityTesting + UNIT_COSTS.complianceTesting + UNIT_COSTS.packaging
  return {
    components: Math.round(components * 100) / 100,
    hardware: Math.round(hardware * 100) / 100,
    complete: Math.round((hardware + UNIT_COSTS.naloxoneRefill) * 100) / 100,
    count: bom.reduce((n, category) => n + category.items.length, 0),
  }
}
