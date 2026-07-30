import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { seedTestUser, cleanupTestUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    const token = await seedTestUser()

    context = await browser.newContext()
    await context.addCookies([
      {
        name: 'agenthub-admin-token',
        value: token,
        url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3103',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ])
    page = await context.newPage()
  })

  test.afterAll(async () => {
    await context?.close()
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/?$/)
    const dashboardArtifact = page.locator('a[href="/admin/collections/users"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('/admin/collections/users')
    await expect(page).toHaveURL(/\/admin\/collections\/users(\?.*)?$/)
    const listViewArtifact = page.locator('h1', { hasText: '用户' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to Agent create view', async () => {
    await page.goto('/admin/collections/agents/create')
    await expect(page).toHaveURL(/\/admin\/collections\/agents\/create$/)
    const editViewArtifact = page.locator('input[name="name"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
