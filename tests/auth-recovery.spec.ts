import { expect, test } from '@playwright/test'

// These network-edge fixtures run against the built app or a preview URL. Every auth
// write is intercepted; no real accounts, recovery emails or production sessions.
test.describe('Authentication recovery with isolated network fixtures', () => {
  test('confirmation-required signup, corrected email and resend cooldown', async ({ page }) => {
    const sent: Record<string, unknown>[] = []
    await page.route('**/api/auth', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, authenticated: false } })
      const input = route.request().postDataJSON() as Record<string, unknown>
      sent.push(input)
      return route.fulfill({ status: input.action === 'signup' ? 202 : 200, json: { success: true, confirmationRequired: true, ...(input.action === 'resend-signup' ? { retryAfter: 60 } : {}), message: 'If this address has an unconfirmed account, a confirmation email will arrive.' } })
    })
    await page.goto('/auth')
    await page.getByRole('button', { name: 'Create an account', exact: true }).click()
    await page.getByLabel('Display name', { exact: true }).fill('Preview fixture')
    await page.getByLabel('Email', { exact: true }).fill('typo@example.invalid')
    await page.getByLabel('Password', { exact: true }).fill('fixture-password')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.locator('#main-content').getByRole('alert')).toContainText('If this address')
    await page.getByLabel('Email', { exact: true }).fill('corrected@example.invalid')
    await page.getByRole('button', { name: 'Resend confirmation email' }).click()
    await expect(page.getByRole('button', { name: 'Resend confirmation email' })).toBeDisabled()
    expect(sent.at(-1)).toEqual({ action: 'resend-signup', email: 'corrected@example.invalid' })
    await expect(page).toHaveURL(/\/auth$/)
  })

  test('expired session notice, safe login return and sign-out', async ({ page }) => {
    let authenticated = false
    await page.route('**/api/auth', async route => {
      if (route.request().method() === 'POST') {
        const input = route.request().postDataJSON() as { action: string; next?: string }
        authenticated = input.action === 'login'
        return route.fulfill({ json: { success: true, next: input.next } })
      }
      return route.fulfill({ json: { available: true, authenticated, user: authenticated ? { id: 'fixture', email: 'fixture@example.invalid' } : null } })
    })
    await page.route('**/api/account/vault', route => route.fulfill({ json: { vault: null } }))
    await page.goto('/auth?reason=expired&next=https%3A%2F%2Fevil.invalid')
    await expect(page.locator('#main-content').getByRole('alert')).toContainText('session has expired')
    await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid')
    await page.getByLabel('Password', { exact: true }).fill('fixture-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByTestId('account-signed-in')).toBeVisible()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page.getByTestId('account-signed-out')).toBeVisible()
  })

  test('password reset validates confirmation, shows success and handles expired link', async ({ page }) => {
    let ready = true
    let writes = 0
    await page.route('**/api/auth/password', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { ready } })
      writes++
      expect(route.request().postDataJSON()).toEqual({ password: 'new-fixture-password' })
      ready = false
      return route.fulfill({ json: { success: true } })
    })
    await page.goto('/auth/reset')
    await page.getByLabel('New password', { exact: true }).fill('new-fixture-password')
    await page.getByLabel('Confirm new password', { exact: true }).fill('wrong-password')
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Passwords do not match' })).toBeVisible()
    expect(writes).toBe(0)
    await page.getByLabel('Confirm new password', { exact: true }).fill('new-fixture-password')
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByRole('heading', { name: 'Password changed' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/auth')
    await page.reload()
    await expect(page.getByRole('status').filter({ hasText: 'expired or was already used' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change password' })).toHaveCount(0)
  })
})
