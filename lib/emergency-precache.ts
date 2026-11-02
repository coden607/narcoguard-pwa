// Pages and files that must work with no signal (#298). tests/feature-precache-audit.test.ts
// fails the quality job if any of these drops out of the service worker's APP_SHELL.
// Add a path here when a new emergency or emergency-adjacent page ships.
export const EMERGENCY_OFFLINE_PATHS = [
  "/",
  "/offline.html",
  "/ar",
  "/bystander",
  "/bystander-qr.svg",
  "/911-script",
  "/rescue-breathing",
  "/aftercare",
  "/check-on-me",
  "/naloxone-card",
  "/manifest.webmanifest",
] as const
