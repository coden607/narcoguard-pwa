# NarcoGuard NG camera design requirement

Status: research / prototype requirement. No production NG hardware has shipped.

## Purpose

A camera is useful only as an explicitly activated sensor for user-requested tasks such as:

- guided training and augmented-reality overlays;
- scanning a meal or package after the user asks NarcoGuard to log it;
- reading a medication or naloxone label for the user;
- scanning a QR code or resource sign;
- documenting a location or item when the user deliberately chooses to do so.

The camera is **not** an always-on monitor and must not be used for covert surveillance, continuous life-logging, automatic face recognition, or passive recording of bystanders.

## Hardware requirements

1. Front-facing or outward-facing low-power camera suitable for close-range scanning and training overlays.
2. Separate physical **camera-active LED** wired to the camera power rail so software cannot power the camera without the light being on.
3. Separate physical **microphone-active LED** wired to the microphone/codec capture-enable path so software cannot record audio without the mic indicator being on.
4. Camera and microphone indicators must be visually distinct and remain lit for the full duration of capture, including background capture states.
5. The app/watch UI must mirror these hardware states with accessible text/icons such as “Camera on” and “Microphone on”; the software indicator supplements but never replaces the hardwired lights.
6. Hardware privacy shutter or electrical camera-disable switch in later prototype revisions, plus a hardware microphone mute/disable control where practical.
7. No camera or microphone buffer retained across reboots.
8. Camera and microphone remain powered down unless an explicit user action starts a task that requires them.
9. Audio capture is independent from camera capture and requires its own permission and indicator.
10. Sensor failure or denied permission must not block SOS, naloxone guidance, emergency calling, or basic Guardian resource access.

## Software/privacy contract

- Browser/app permission is requested only after the user taps a camera action.
- Denial falls back to non-camera training and manual logging.
- Frames stay on-device unless the user explicitly chooses a feature that requires upload and separately consents to that upload.
- NarcoGuard must never infer that a person ate, showered, took medication, or completed another life necessity solely because an image was captured.
- A high-confidence direct observation may create a proposed log entry; uncertain observations must ask the user to confirm.
- Camera-derived health or safety conclusions must not be represented as clinical detection without separate validation.

## Prototype validation

Camera prototypes must test: denied permission, revoked permission mid-session, backgrounding, low light, camera unavailable, browser unsupported, offline mode, visible indicator behavior, and emergency-path independence.


## Women-centered watch variant

NarcoGuard NG should include a women-centered industrial-design variant rather than treating one oversized unisex shell as the only form factor.

### Design goals

- Smaller case and shorter lug-to-lug geometry for narrower wrists while preserving the same safety functions.
- Multiple strap lengths and soft, replaceable bands that avoid pressure points during sleep.
- Rounded case edges, low profile, and a lighter visual footprint suitable for continuous wear.
- Same sensor, battery, SOS, camera/microphone privacy-indicator, and emergency-path requirements as every other NG variant; appearance must never reduce safety capability.
- Optional jewelry-inspired finishes and interchangeable bands without making the device look like a medical alarm.
- Controls sized for reliable one-handed use with long nails, gloves, tremor, or reduced dexterity.
- Camera and microphone indicator lights remain clearly visible from normal viewing angles.
- Haptics, speaker, microphone, and display remain strong enough to be noticed in noisy environments.
- No gendered health assumptions: the variant is an ergonomic and aesthetic option, available to any user.

### Prototype sizes

Evaluate at least two case classes instead of a single shell:
- Compact: approximately 38–40 mm class for smaller wrists.
- Standard: approximately 42–45 mm class for larger batteries or users who prefer a larger display.

Final dimensions require battery, antenna, sensor, thermal, accessibility, and wearability validation.
