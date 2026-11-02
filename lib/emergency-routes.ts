// Pages where Call 911 is the main action (#314). The site-wide funding banner is left off
// these so nothing sits between a bystander and the Call 911 button, even at large text sizes.
// Error and not-found screens can appear at any URL, so they hide the banner with CSS instead
// (see [data-funding-banner] in app/globals.css).
export const EMERGENCY_PRIMARY_PATHS = ["/ar", "/911-script", "/bystander", "/rescue-breathing", "/aftercare"] as const

export function isEmergencyPrimary(pathname: string): boolean {
  return EMERGENCY_PRIMARY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
