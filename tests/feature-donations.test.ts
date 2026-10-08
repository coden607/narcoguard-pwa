import { strict as assert } from "node:assert"
import { createHmac } from "node:crypto"
import { test } from "node:test"
import { checkoutSessionParams, donationMode, parseDonationAmount, verifyStripeSignature } from "../lib/donations"

test("test keys enable test mode; live keys need the explicit go-live switch", () => {
  assert.equal(donationMode({}), null)
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "sk_test_x" }), "test")
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "sk_live_x" }), null)
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "sk_live_x", DONATIONS_LIVE: "yes" }), null)
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "sk_live_x", DONATIONS_LIVE: "true" }), "live")
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "pk_test_x" }), null)
})

test("only whole-dollar amounts within limits are accepted", () => {
  assert.equal(parseDonationAmount(25), 25)
  assert.equal(parseDonationAmount("307"), 307)
  for (const bad of [4, 10_001, 12.5, "abc", null, undefined, -10, "1e3x"]) assert.equal(parseDonationAmount(bad), null, String(bad))
})

test("checkout asks Stripe for a one-off USD donation in cents with return URLs on this site", () => {
  const params = checkoutSessionParams(25, "https://www.narcoguard.app")
  assert.equal(params.get("mode"), "payment")
  assert.equal(params.get("submit_type"), "donate")
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "2500")
  assert.equal(params.get("line_items[0][price_data][currency]"), "usd")
  assert.equal(params.get("success_url"), "https://www.narcoguard.app/fund/thanks?session_id={CHECKOUT_SESSION_ID}")
  assert.match(params.get("cancel_url") ?? "", /^https:\/\/www\.narcoguard\.app\/fund/)
})

test("webhook signatures are verified, including timestamp tolerance", () => {
  const secret = "whsec_test"
  const payload = '{"type":"checkout.session.completed"}'
  const now = 1_700_000_000
  const sign = (t: number) => createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")
  assert.equal(verifyStripeSignature(payload, `t=${now},v1=${sign(now)}`, secret, now), true)
  assert.equal(verifyStripeSignature(payload, `t=${now},v1=${sign(now)}`, "other", now), false)
  assert.equal(verifyStripeSignature(payload + " ", `t=${now},v1=${sign(now)}`, secret, now), false)
  assert.equal(verifyStripeSignature(payload, `t=${now - 301},v1=${sign(now - 301)}`, secret, now), false)
  assert.equal(verifyStripeSignature(payload, null, secret, now), false)
  assert.equal(verifyStripeSignature(payload, "t=abc,v1=00", secret, now), false)
})

test("the thank-you page only trusts a real, paid Checkout Session and shows no personal data", async () => {
  const { isCheckoutSessionId, receiptFromSession } = await import("../lib/donations")
  assert.ok(isCheckoutSessionId("cs_test_a1B2c3D4e5F6g7H8"))
  for (const bad of ["", "cs_test_", "pi_123", "cs_test_abc/../../v1/customers", "{CHECKOUT_SESSION_ID}", null]) assert.equal(isCheckoutSessionId(bad), false, String(bad))
  assert.deepEqual(receiptFromSession({ object: "checkout.session", payment_status: "paid", amount_total: 2500, currency: "usd", livemode: false, customer_details: { email: "a@b.c" } }), { paid: true, amountDollars: 25, test: true })
  assert.deepEqual(receiptFromSession({ object: "checkout.session", payment_status: "unpaid", amount_total: 2500, currency: "usd", livemode: true }), { paid: false, amountDollars: 25, test: false })
  assert.equal(receiptFromSession({ object: "customer" }), null)
  assert.equal(receiptFromSession(null), null)
})
