import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('can load homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/鲸创 AgentHub/)
    const heading = page.locator('h1').first()
    await expect(heading).toHaveText('发现真正好用的 Agent')
  })
})
