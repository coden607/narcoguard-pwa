// =============================================================================
// CANDIDATE BILL OF MATERIALS - supplier and part numbers require confirmation.
// This is a research concept, not a manufacturing-ready or medical-device BOM.
// =============================================================================
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
        name: "Nordic nRF5340 Safety MCU",
        description: "Independent low-power microcontroller that keeps sensor sampling and local alarms running if the main OS crashes or reboots. Algorithms on it are unvalidated.",
        quantity: 1,
        unitPrice: 8.50,
        supplier: "Nordic Semiconductor",
        partNumber: "NRF5340-QKAA-R7",
        datasheet: "nordicsemi.com/nRF5340",
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
        description: "6-axis IMU (32 g accelerometer + gyroscope) for motion, falls, sleep and motion-artifact rejection in the vitals pipeline",
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
        name: "ams-OSRAM AS7038RB",
        description: "Candidate secondary biosensor front end for electrodermal/stress research; confirm feature set and long-term availability before committing",
        quantity: 1,
        unitPrice: 3.90,
        supplier: "ams-OSRAM",
        partNumber: "AS7038RB",
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
        name: "Infineon CYW43022 Wi-Fi/Bluetooth",
        description: "Candidate low-power Wi-Fi + Bluetooth LE combo for phone pairing and Wi-Fi sync; confirm compatibility with the W5+ Gen 2 reference design",
        quantity: 1,
        unitPrice: 4.80,
        supplier: "Infineon (Cypress)",
        partNumber: "CYW43022KUBG",
        datasheet: "infineon.com/CYW43022",
      },
      {
        name: "STMicro ST4SIM-200M eSIM (eUICC)",
        description: "Embedded SIM for standalone cellular with remote carrier provisioning (GSMA). Replaces the previously listed Thales ELS62, which is a separate LTE module, not an eSIM.",
        quantity: 1,
        unitPrice: 2.50,
        supplier: "STMicroelectronics",
        partNumber: "ST4SIM-200M",
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
    description: "Battery with sealed Qi charging. Solar, kinetic and thermoelectric harvesters were removed: on a wrist they produce microwatts to a few milliwatts, far below a cellular smartwatch's load, and the listed solar supplier (Alta Devices) shut down in 2019.",
    items: [
      {
        name: "500 mAh Li-ion polymer cell (certified)",
        description: "Custom-shape lithium-polymer cell with protection circuit; must hold IEC 62133-2 and UN38.3 certification. Supplier (e.g. ATL, Amperex, or other wearable-cell maker) to be quoted.",
        quantity: 1,
        unitPrice: 8.50,
        supplier: "Qualified wearable-cell supplier (TBD)",
        partNumber: "TBD (500 mAh)",
        datasheet: "iec.ch (IEC 62133-2)",
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
        description: "Single-cell charger with power path and low quiescent current, fed by the Qi receiver",
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
        name: "1.4–1.5 in round LTPO AMOLED module",
        description: "Round always-on-capable AMOLED with touch; resolution, brightness and price from a supplier quote (e.g. BOE, Samsung Display)",
        quantity: 1,
        unitPrice: 32.00,
        supplier: "BOE / Samsung Display (TBD)",
        partNumber: "TBD (quote)",
        datasheet: "boe.com",
      },
      {
        name: "Knowles SPH0645LM4H-B MEMS Mic",
        description: "Digital I2S MEMS microphone for voice input to Angel AI and calls; behind a waterproof acoustic membrane",
        quantity: 1,
        unitPrice: 1.50,
        supplier: "Knowles Corporation",
        partNumber: "SPH0645LM4H-B",
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
        name: "TDK PowerHap 1204H018V",
        description: "Piezoelectric haptic actuator for distinct alert vibration patterns",
        quantity: 1,
        unitPrice: 3.80,
        supplier: "TDK Corporation",
        partNumber: "1204H018V",
        datasheet: "tdk.com/PowerHap",
      },
    ],
  },
  {
    category: "Naloxone Delivery Module (future research only)",
    description: "Research-only concept. A wearable that injects a drug is an FDA-regulated drug-device combination product; nothing here is implemented, tested or approved",
    items: [
      {
        name: "Faulhaber 0206B Micro DC Motor",
        description: "1.9 mm coreless micro motor considered for driving a plunger. Force, speed and reliability for an injection must be proven on a bench before any further design.",
        quantity: 1,
        unitPrice: 28.00,
        supplier: "Faulhaber Group",
        partNumber: "0206B-012-SR",
        datasheet: "faulhaber.com/0206B",
      },
      {
        name: "Needle and insertion mechanism (to be specified)",
        description: "Needle gauge, length and insertion speed must be set by clinical engineering for intramuscular naloxone. The 30-gauge, 4 mm micro-needle previously listed does not match how naloxone is injected. (For reference, the discontinued Evzio auto-injector delivered 2 mg in 0.4 mL.)",
        quantity: 1,
        unitPrice: 15.00,
        supplier: "Medical-device contract manufacturer (TBD)",
        partNumber: "TBD",
        datasheet: "fda.gov (combination products)",
      },
      {
        name: "Naloxone primary container (to be specified)",
        description: "Drug container must come from a licensed drug manufacturer with stability, sterility and shelf-life data; it cannot be filled by NarcoGuard",
        quantity: 1,
        unitPrice: 8.00,
        supplier: "Licensed pharmaceutical partner (TBD)",
        partNumber: "TBD",
        datasheet: "fda.gov",
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
  "500 mAh Li-ion polymer cell (certified)": {
    name: "300 mAh Li-ion polymer cell (certified)",
    description: "Custom-shape cell about 24×19×4.2 mm, the capacity class used in 40–41 mm smartwatches, with protection circuit; must hold IEC 62133-2 and UN38.3 certification. Runtime will be shorter than the 46 mm and must be measured.",
    unitPrice: 7.0,
    partNumber: "TBD (300 mAh)",
  },
  "Wurth 760308103 Qi Coil": {
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
  "Medical Silicone Sport Strap (w/ Quick-Release)": {
    description: "Candidate LSR silicone strap with a 20 mm interface, supplied with small/medium and medium/large bands so it fits smaller wrists; biocompatibility and skin contact require qualification",
    partNumber: "NG-STRAP-LSR-20MM",
  },
  "Ceramic Case Back w/ Sensor Windows": {
    description: "Zirconia ceramic case back sized for the 40 mm case, with optical windows for PPG/SpO2 sensors and the device ID and QR code",
    unitPrice: 10.0,
    partNumber: "NG-BACK-ZRO2-40",
  },
  "Needle and insertion mechanism (to be specified)": {
    description: "Same research item as the 46 mm. Needle length and insertion depth for intramuscular naloxone would be set by clinical engineering for the wearer's body size, not by sex. Nothing here is built or tested.",
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
