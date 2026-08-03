import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { seedTestUser, seedOrdinaryTestUser, cleanupTestUser } from '../helpers/seedUser'

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
    await expect(page.getByRole('region', { name: 'Skill 文件投稿' })).toBeVisible()
    await expect(page.getByRole('button', { name: '保存到本地并提交审核' })).toBeDisabled()
  })
})

test.describe('Ordinary user admin workspace', () => {
  let page: Page
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    const token = await seedOrdinaryTestUser()
    context = await browser.newContext()
    await context.addCookies([{
      name: 'agenthub-admin-token',
      value: token,
      url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3103',
      httpOnly: true,
      sameSite: 'Strict',
    }])
    page = await context.newPage()
  })

  test.afterAll(async () => {
    await context?.close()
    await cleanupTestUser()
  })

  test('only exposes Agents and Agent versions', async () => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/?$/)
    await expect(page.locator('a[href="/admin/collections/agents"]').first()).toBeVisible()
    await expect(page.locator('a[href="/admin/collections/agent-versions"]').first()).toBeVisible()

    for (const collection of ['users', 'media', 'categories', 'favorites', 'download-records', 'skill-submissions', 'skill-upload-requests']) {
      await expect(page.locator(`a[href="/admin/collections/${collection}"]`)).toHaveCount(0)
    }
  })

  test('can create a draft Agent and sees the local upload panel', async () => {
    await page.goto('/admin/collections/agents/create')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Skill 文件投稿' })).toBeVisible()
    await expect(page.getByRole('button', { name: '保存到本地并提交审核' })).toBeDisabled()
  })
})
