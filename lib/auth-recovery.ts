export const AUTH_EMAIL_COOLDOWN_SECONDS = 60
export const RECOVERY_VERIFIER_COOKIE = 'ng_recovery_verifier'
export const RECOVERY_TOKEN_COOKIE = 'ng_recovery_token'
export const RECOVERY_MAX_AGE_SECONDS = 600

/** Return only local pages; never carry authentication material into navigation. */
export function safeAuthDestination(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/account'
  try {
    const decoded = decodeURIComponent(value)
    if (decoded.startsWith('//') || /[\\\s]/.test(decoded)) return '/account'
    if (/^\/(?:auth|api)(?:\/|$)/.test(decoded.split(/[?#]/)[0])) return '/account'
    const url = new URL(value, 'https://local.invalid')
    if (url.origin !== 'https://local.invalid' || /^\/(?:auth|api)(?:\/|$)/.test(url.pathname) || /(?:token|code|password|secret)/i.test(url.search) || [...url.searchParams.keys()].some(key => /(?:token|code|password|secret)/i.test(key))) return '/account'
    return url.pathname + url.search
  } catch { return '/account' }
}

export function recoveryNotice(action: 'resend-signup' | 'reset-password'): string {
  return action === 'resend-signup'
    ? 'If this address has an unconfirmed account, a confirmation email will arrive. Check your inbox and spam folder.'
    : 'If this address has an account, a password reset email will arrive. Open it in this browser within 10 minutes.'
}

export function isSameAuthOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try { return new URL(origin).origin === new URL(request.url).origin } catch { return false }
}
