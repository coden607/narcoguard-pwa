# NarcoGuard Rev 5 GoFundMe campaign copy

Paste-ready campaign draft updated for the current NarcoGuard app and Rev 5 NG46 / NG40 wearable concept.

## Put these links at the very top of the live GoFundMe

# **USE NARCOGUARD FREE: https://narcoguard.app**

# **WATCH THE REV 5 PROJECT: https://narcoguard.app/watch**

# **SHARE THIS FUNDRAISER: https://gofund.me/9acf270ea**

These should be large, clickable links in the published campaign description and repeated near the final call to action so donors can verify the live app and engineering work before contributing.

---

## Recommended title

**Help Build NarcoGuard: Free Recovery Help + Safer Wearable R&D**

## Short description

NarcoGuard is a free overdose-prevention and recovery-support app from Binghamton, NY. We are now funding Rev 5 development of two wearable sizes, safety-focused energy harvesting, privacy-controlled camera hardware, sensing research, and real prototype validation.

## Recommended initial goal

**$75,000 development goal**

This is a planning target, not a supplier quote and not a promise to manufacture a fixed number of watches. Rev 5 adds unquoted research hardware and engineering work, so an exact per-watch cost would be misleading until vendor quotes and physical prototypes exist.

Suggested planning allocation:

| Workstream | Planning amount |
| --- | ---: |
| Mechanical CAD, industrial design, enclosure, seals and tolerance stack | $15,000 |
| NG46 + NG40 prototype electronics, PCB spins, displays, batteries and assembly | $20,000 |
| Bench equipment, sensor fixtures, power/harvesting characterization and reliability tests | $10,000 |
| RF, 5G RedCap, GNSS, antenna, eSIM and wireless-integration work | $10,000 |
| Safety, clinical, human-factors and regulatory consulting | $10,000 |
| Free app, Hero network, resource data, hosting, security and accessibility | $5,000 |
| Contingency for failed prototypes, replacement parts and supplier changes | $5,000 |
| **Total** | **$75,000** |

These are planning allowances, not contracted quotes. Public updates should report actual spending and revise the budget when supplier quotes arrive.

---

# Story

## Why NarcoGuard exists

My name is Stephen Blanford. I'm in recovery, and I have lost too many friends to overdose. I built NarcoGuard around a simple idea: help should still be available when someone is alone, scared, hungry, without transportation, looking for treatment, or trying to build a more stable life.

NarcoGuard starts with the person, not a score. It uses a needs-first approach inspired by Maslow's hierarchy: food, shelter, sleep and safety matter before anyone can reasonably be expected to focus on bigger goals.

The long-term wearable vision grew from an even harder problem: many fatal overdoses happen when nobody is there to recognize what is happening and give naloxone. We want to research whether a wearable can safely recognize concerning patterns, warn the wearer, summon help with consent and appropriate emergency boundaries, and one day support clinically validated overdose-response technology.

That future is not here yet. The watch is a research concept, not a medical device, and NarcoGuard does not replace 911 or naloxone.

## What is live now

The free web app is available at **https://www.narcoguard.app**.

Current app capabilities include:

- emergency overdose-response and CPR guidance;
- needs-first resource search for food, shelter, showers, treatment, clinics, pharmacies and other practical support;
- Angel AI for optional conversational support and small next-step planning;
- Guardian Stability planning for basic needs, sleep, goals and tomorrow's task;
- Daily Life routines, schedule, journals and reset tools;
- local Calm Audio with binaural tone presets and generated meditation soundscapes;
- Hero training and certification;
- a live Hero/resource network architecture with coarse privacy-preserving map areas;
- certified-Hero request lifecycle and optional Web Push alerts;
- overdose Good Samaritan law summaries;
- optional account features while keeping ordinary help available without an account;
- installable PWA behavior for phones.

NarcoGuard remains a public research project. Resource listings can change, Hero availability is not emergency dispatch, and the app does not diagnose overdose.

## The Rev 5 NarcoGuard NG wearable

The hardware program now has two size targets:

### NG46

- 46 mm Grade 5 titanium case;
- 13.8 mm target thickness;
- 22 mm strap;
- 1.4–1.5 inch round LTPO AMOLED target;
- 500 mAh protected Li-ion battery target.

### NG40

- 40 mm Grade 5 titanium case;
- 12.2 mm target thickness;
- 20 mm strap;
- 1.2 inch round AMOLED target;
- 300 mAh protected Li-ion battery target.

Anyone can wear either size. The smaller model is not a different safety product; it is a smaller enclosure with the same core safety architecture.

## Current candidate electronics

The current engineering concept includes:

- **Qualcomm Snapdragon W5+ Gen 2** wearable platform;
- **Nordic nRF5340** independent safety MCU;
- **32 GB eMMC** and **2 GB LPDDR4X** target memory;
- **Analog Devices MAX86178** PPG / ECG / BioZ front end;
- **ST LSM6DSO32X** 6-axis IMU;
- **Bosch BMP390** barometer;
- **ST LIS2MDL** magnetometer;
- **Melexis MLX90632** temperature-sensing candidate;
- **ams-OSRAM AS7038RB** secondary biosensing candidate;
- **Qualcomm X35 / SDX35 5G RedCap** cellular concept;
- **ST4SIM-200M** eSIM;
- **ST54K** NFC / secure-element architecture;
- sealed **Qi wireless charging**;
- zirconia ceramic case back;
- sapphire crystal;
- microphone, speaker and haptic alert hardware.

Every candidate still requires supplier confirmation, electrical integration, firmware, physical prototyping and validation.

## Rev 5 energy system

The primary power system remains a protected Li-ion battery with sealed Qi wireless charging.

Rev 5 adds research paths intended to extend emergency reserve or runtime:

### Manual crown generator

The crown is being redesigned as both a physical SOS/cancel control and a possible manual microgenerator. The goal is not to run the whole watch by hand. The research goal is to determine whether turning the crown can restore enough reserve energy for the independent safety MCU, a local alarm, and potentially an emergency communications attempt.

### Solar harvesting

A segmented photovoltaic ring around the bezel or crystal area is being investigated for supplemental charging.

### Thermoelectric harvesting

A thin case-back thermoelectric layer is being investigated to recover a small amount of energy from the skin-to-ambient temperature difference.

### Automatic self-winding electrical rotor

We are also investigating an electrical version of an automatic mechanical watch: an oscillating mass converts wrist motion into electricity. This is experimental because the rotor competes with the battery, Qi coil, sensors and antennas for space.

### Emergency reserve

The design includes a separate supercapacitor-style safety reserve so the main processor and display cannot drain every last bit of emergency power.

None of these harvesting systems is represented as capable of continuously powering the full watch. We will publish measured output before making any runtime claim.

## Privacy-controlled camera

Rev 5 also investigates a miniature camera for user-started functions such as:

- video calls;
- QR or barcode capture;
- document capture;
- explicitly shared emergency context.

The camera is **not** part of overdose detection and is not intended for always-on recording.

Our design rules require:

- camera off by default;
- a mechanical shutter that physically blocks the lens;
- a hard sensor power gate;
- a privacy indicator electrically tied to camera power;
- no default continuous background recording;
- no requirement for facial recognition;
- local storage unless the wearer explicitly chooses to share.

Emergency functions must continue to work with the camera disabled.

## Why we need physical prototypes

Good renders are not proof that a watch can be built.

Before NarcoGuard should call the hardware build-ready, we need to prove:

- actual component packages fit together;
- the NG46 and NG40 PCB layouts can be routed;
- the Snapdragon, safety MCU, radio, battery and sensor stack fit with real tolerances;
- antennas work inside a titanium enclosure;
- heat can leave the case safely;
- the camera and privacy shutter can be sealed;
- the crown generator produces useful energy;
- solar, thermoelectric and automatic-rotor harvesting produce enough energy to justify their size and complexity;
- the Qi coil, rear optical sensor and any rotor architecture can coexist;
- the optical sensors remain usable across motion, placement and skin conditions;
- the battery, charging system and emergency reserve are electrically safe;
- seals survive water, sweat, button cycles, charging cycles and drops.

Failed prototypes are useful information. We will publish what fails instead of hiding it.

## The future naloxone research module

NarcoGuard began with the idea of a wearable that might one day help when someone overdoses alone.

That remains a **future research program**, not a current feature.

A drug-delivery wearable would require a separate clinical, mechanical, pharmaceutical, human-factors and regulatory program. Needle geometry, dose, primary drug container, insertion mechanism and activation logic are not finalized and will not be treated as solved by a 3D render.

No NarcoGuard watch currently injects naloxone.

## The Hero network

NarcoGuard also includes a community responder concept.

Certified Heroes can be trained in overdose response and are expected to understand that **911 remains the emergency system**. The network is intended to supplement help, not replace EMS.

The architecture supports privacy-preserving coarse areas and only uses more precise location where an accepted request and explicit emergency workflow require it.

Community resources can also appear independently of Hero responders so people can contribute useful information without acting as emergency responders.

## Where the money goes

The recommended initial campaign goal is **$75,000**.

The money is intended for:

- CAD and mechanical engineering;
- NG46 and NG40 prototype enclosures;
- PCB layout and fabrication;
- component purchases;
- sensor and power test fixtures;
- crown-generator prototypes;
- solar, thermoelectric and kinetic energy testing;
- camera/privacy-shutter prototypes;
- RF and antenna development;
- 5G/eSIM/GNSS integration work;
- safety and human-factors review;
- app hosting and continued free public access;
- failed prototype replacement and design revisions.

This is research and prototype funding. A donation does not purchase a watch or reserve a production unit.

## Transparency

I will keep the project public and distinguish between:

- what exists in software;
- what has been built in hardware;
- what has been tested;
- what is still only a candidate design;
- what has failed.

The parts list, engineering notes and software are published through the NarcoGuard project and GitHub repository.

The campaign will not call NarcoGuard FDA approved, medically validated, waterproof, self-powered or capable of detecting/reversing overdose unless independent evidence supports those claims.

## How you can help

# **LIVE APP: https://narcoguard.app**

# **GOFUNDME: https://gofund.me/9acf270ea**


**Donate:** support prototype development and testing.

**Share:** send people to https://www.narcoguard.app.

**Use the free app:** practical help is available without buying a device.

**Become a Hero:** take the training and certification process.

**Contribute engineering expertise:** RF, embedded systems, PCB design, wearable mechanics, clinical sensing, battery safety, human factors and regulatory expertise are all useful.

If someone may be overdosing, call 911 and give naloxone if available.

Thank you,

**Stephen Blanford**  
Founder, NarcoGuard  
Binghamton, New York  
narcoguard607@gmail.com

---

## Suggested giving levels

| Amount | Example use |
| --- | --- |
| $10 | Hosting, data access or bench consumables |
| $25 | Small components, connectors, seals or test materials |
| $50 | Sensors, power-management parts or prototype materials |
| $100 | PCB, fixture or mechanical prototype work |
| $250 | Partial prototype assembly/testing costs |
| $500 | Major electronics/mechanical prototype work |
| $1,000+ | Engineering, RF, testing or specialist review work |

Do not say a donation amount purchases a finished watch.

## Campaign images

Use:
1. real screenshots of the live app;
2. the NG46 / NG40 Rev 5 concept board, clearly marked "concept";
3. engineering drawings generated from the repository geometry;
4. future photos of real PCB, enclosure and bench prototypes;
5. spending/test updates.

Do not use a concept render as though it were a photographed finished product.

## Publication checklist

Before launch:
- verify payout recipient and organization;
- verify current campaign category and platform requirements;
- replace any old $36,032 / 80-watch language;
- confirm the $75,000 planning target is acceptable;
- keep the public app URL current;
- update campaign images with Rev 5 concept labels;
- publish the spending allocation as a planning budget, not quotes;
- add real vendor quotes as they become available;
- never imply donations are tax-deductible unless that is legally true;
- never promise devices to donors before manufacturing, regulatory and safety status permits it.
