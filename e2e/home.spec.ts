import { expect, test } from '@playwright/test'

test('home page renders its server-rendered content', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/Tenshi\.My\.id/)
  await expect(page.getByRole('heading', { name: 'Populer' })).toBeVisible()
})
