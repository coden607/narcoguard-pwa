// Numbered callouts shared by the engineering drawing, the 3D model and the component legend on
// /watch. Part numbers are candidates that still need supplier confirmation.

export interface WatchComponent {
  id: string
  name: string
  partNumber: string
  color: string
  description: string
}

export const WATCH_COMPONENTS: readonly WatchComponent[] = [
  { id: "snapdragon", name: "Snapdragon W5+ Gen 2", partNumber: "W5+ Gen 2 (SKU TBD)", color: "#FF4136", description: "Qualcomm's current wearable platform (2025): 4nm, Wear OS, always-on co-processor, GNSS and satellite SOS messaging. NarcoGuard firmware does not exist yet." },
  { id: "nordic", name: "nRF5340 Safety MCU", partNumber: "NRF5340-QKAA-R7", color: "#FF851B", description: "Independent microcontroller intended to keep sensing and local alarms running if the main OS fails; firmware not written." },
  { id: "display", name: '1.45" LTPO AMOLED', partNumber: "466×466 LTPO (vendor TBD)", color: "#FFDC00", description: "466x466 round display, 1-120Hz adaptive. Always-on mode would show status without waking the main processor. Brightness and vendor are unconfirmed." },
  { id: "ppg-ecg", name: "MAX86178 PPG+ECG+BioZ", partNumber: "MAX86178", color: "#FF69B4", description: "Optical + electrical front end: heart rate, SpO2 estimate, single-lead ECG and skin contact. Wrist accuracy for overdose detection is unproven." },
  { id: "naloxone", name: "Naloxone Module (research)", partNumber: "Not specified", color: "#FF0000", description: "Future research only: drug container, needle and actuator would need clinical engineering, a pharmaceutical partner and FDA review. Not functional." },
  { id: "battery", name: "500mAh Li-ion + Qi Charging", partNumber: "500 mAh cell (TBD)", color: "#7FDBFF", description: "Certified cell with sealed Qi charging; runtime must be measured on a prototype." },
  { id: "cellular", name: "5G RedCap + eSIM", partNumber: "SDX35 + ST4SIM-200M", color: "#39CCCC", description: "Snapdragon X35 RedCap modem with LTE fallback and an ST4SIM eSIM; carrier certification and antenna performance unverified." },
  { id: "gps", name: "GNSS + Satellite SOS", partNumber: "Platform GNSS + LDS antenna", color: "#01FF70", description: "Location from the platform/modem GNSS (no separate chip); satellite SOS via the W5+ Gen 2 platform. Field accuracy unverified." },
  { id: "crown", name: "Crown + SOS Button", partNumber: "Custom crown + seal + switch", color: "#AAAAAA", description: "Physical button to start a manual SOS or cancel a false alarm; sealing and press force require qualification." },
  { id: "sealed-charge", name: "Sealed Qi / Service Boundary", partNumber: "Qi receiver coil (TBD)", color: "#FFFFFF", description: "No external charging opening; Qi charging and gasketed internal service access are design targets." },
  { id: "nfc", name: "NFC + secure element", partNumber: "ST54K", color: "#0074D9", description: "STMicro ST54K: NFC for an opt-in emergency medical-ID tap and pairing, plus the embedded secure element that holds the watch's private key and its owner record for the owner lock. Secure-element firmware is not written yet." },
  { id: "crown-generator", name: "Manual Crown Generator", partNumber: "Custom microgenerator + rectifier", color: "#B10DC9", description: "Rev 5 research power input: the sealed crown can mechanically generate emergency reserve energy. Output must be measured at realistic rotation speeds; it supplements Qi and the battery rather than replacing them." },
  { id: "energy-harvest", name: "Multi-source Energy Harvester", partNumber: "ADP5091/ADP5092 + LTC3331-class path", color: "#2ECC40", description: "Research power path for solar, thermoelectric and rectified kinetic sources feeding an isolated safety reserve. None of these sources is represented as capable of continuously powering the full cellular watch." },
  { id: "automatic-rotor", name: "Automatic Electrical Rotor", partNumber: "Custom annular rotor + magnetic generator", color: "#85144b", description: "Experimental self-winding electrical generator using wrist motion. Preferred as an annular/peripheral rotor so the central optical sensor and Qi path stay clear. Keep only if measured energy gain justifies added mass, thickness and wear." },
  { id: "reserve", name: "Emergency Energy Reserve", partNumber: "Low-profile supercapacitor (TBD)", color: "#F012BE", description: "Electrically isolated reserve intended for the nRF5340 safety MCU, local alarm and, if bench measurements support it, one emergency communications transaction when the main battery is critically low." },
  { id: "camera", name: "Privacy-controlled Camera", partNumber: "OMNIVISION OVM7692-class CameraCubeChip", color: "#3D9970", description: "User-initiated miniature MIPI camera for calls, QR/document capture and explicitly shared emergency context. Off by default with a mechanical shutter, hardware power gate and a privacy indicator tied to the camera power rail; not used for overdose detection." },

]

const overrides40: Record<string, Partial<WatchComponent>> = {
  display: { name: '1.2" round AMOLED', partNumber: "~396×396 round (vendor TBD)", description: "Smaller 1.2 in round always-on-capable AMOLED with touch, the size class used on 40 mm watches. Resolution, brightness and vendor are unconfirmed." },
  battery: { name: "300mAh Li-ion + Qi Charging", partNumber: "300 mAh cell (TBD)", description: "Smaller certified cell, the size class used in 40–41 mm watches, with sealed Qi charging. Expect shorter runtime than the 46 mm; it must be measured on a prototype." },
  cellular: { description: "Same Snapdragon X35 RedCap modem and ST4SIM eSIM, budgeted as a compact 12×12 mm RF module. Module size, carrier certification and antenna performance in the smaller case are unverified." },
  crown: { description: "Same manual SOS and cancel control on a slightly smaller crown; Rev 5 also reserves a smaller crown-generator mechanism. Sealing, torque and cycle life require qualification." },
  "automatic-rotor": { description: "Experimental in the 40 mm model because the smaller case leaves very little room for a rotor, battery, Qi coil and sensor stack. Do not commit to this part until packaging and energy-return tests pass." },
  camera: { description: "Same privacy rules as the 46 mm camera, but the smaller case makes the lens/shutter aperture a higher packaging and sealing risk. Final module and location remain TBD." },
}

/** NG 40 mm: the same safety functions and numbering, with the parts that change for the smaller case. */
export const WATCH_COMPONENTS_40: readonly WatchComponent[] = WATCH_COMPONENTS.map((component) => ({ ...component, ...overrides40[component.id] }))

export const calloutNumber = (id: string) => WATCH_COMPONENTS.findIndex((component) => component.id === id) + 1
