import test from "node:test"
import assert from "node:assert/strict"
import { sendSms, messageStatus, startVerification, checkVerification, TwilioError } from "@/lib/twilio"
import type { AlertsConfig } from "@/lib/contact-alerts"

const mockConfig: AlertsConfig = {
  accountSid: "AC" + "1".repeat(32),
  authToken: "auth_token_mock",
  from: "+15005550006",
  messagingServiceSid: "MG" + "1".repeat(32),
  verifyServiceSid: "VA" + "1".repeat(32),
  secret: "synthetic_secret_for_testing_only_12345",
}

test("sendSms logs to stdout and returns synthetic SID with sent status", async () => {
  const result = await sendSms(mockConfig, "+16075550199", "Emergency alert test")
  assert.equal(result.status, "sent")
  assert.match(result.sid, /^SM[0-9a-f]{32}$/)
})

test("messageStatus reports delivered without requiring external API", async () => {
  const result = await messageStatus(mockConfig, "SM" + "0".repeat(32))
  assert.equal(result.status, "delivered")
  assert.equal(result.errorCode, null)
})

test("messageStatus rejects malformed sid", async () => {
  await assert.rejects(
    async () => {
      await messageStatus(mockConfig, "")
    },
    (err: any) => err instanceof TwilioError && err.status === 400
  )
})

test("startVerification returns pending status", async () => {
  const result = await startVerification(mockConfig, "+16075550199")
  assert.equal(result, "pending")
})

test("checkVerification validates numeric verification code format", async () => {
  assert.equal(await checkVerification(mockConfig, "+16075550199", "123456"), true)
  assert.equal(await checkVerification(mockConfig, "+16075550199", "abc"), false)
})
