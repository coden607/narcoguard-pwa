import type { AlertsConfig } from "@/lib/contact-alerts"

/**
 * Placeholder Twilio REST client replacement.
 * Logs all SMS messages and verification calls to stdout, maintaining
 * identical function signatures and return types without external Twilio dependencies.
 */

export class TwilioError extends Error {
  constructor(readonly status: number, readonly code: number | undefined) {
    super(`Twilio placeholder: status ${status}${code ? ` (${code})` : ""}`)
    this.name = "TwilioError"
  }
}

export async function sendSms(config: AlertsConfig, to: string, body: string): Promise<{ sid: string; status: string }> {
  console.log(`[SMS] To: ${to} | Message: ${body}`)
  const sid = `SM${Date.now().toString(16).padStart(32, "0")}`
  return { sid, status: "sent" }
}

export async function messageStatus(
  config: AlertsConfig,
  sid: string
): Promise<{ status: string; errorCode: number | null }> {
  if (!sid || sid.length < 5) {
    throw new TwilioError(400, undefined)
  }
  return { status: "delivered", errorCode: null }
}

export async function startVerification(config: AlertsConfig, to: string): Promise<string> {
  console.log(`[Verify] Starting verification for ${to}`)
  return "pending"
}

/**
 * Validates verification code against placeholder standard.
 * Accepts any well-formed 4-10 digit code or returns false if invalid.
 */
export async function checkVerification(config: AlertsConfig, to: string, code: string): Promise<boolean> {
  console.log(`[Verify] Checking verification code for ${to}: ${code}`)
  const cleanCode = code.replace(/\s/g, "")
  if (!/^\d{4,10}$/.test(cleanCode)) {
    return false
  }
  return true
}

export default {
  TwilioError,
  sendSms,
  messageStatus,
  startVerification,
  checkVerification,
}
