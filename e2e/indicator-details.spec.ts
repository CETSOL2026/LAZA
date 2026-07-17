import { test, expect } from '@playwright/test';

const officialIndicators = [
  { label: 'GDP Growth', path: '/indicators/gdp-growth' },
  { label: 'Inflation Rate', path: '/indicators/inflation-rate' },
  { label: 'Exchange Rate', path: '/indicators/exchange-rate' },
  { label: 'Population', path: '/indicators/population' },
  { label: 'Banking Assets', path: '/indicators/banking-assets' },
  { label: 'Public Debt/GDP', path: '/indicators/public-debt-gdp' },
];

test.describe('Official indicator details', () => {
  for (const { label, path } of officialIndicators) {
    test(`opening "${label}" from the overview loads its official history`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: `Open ${label} details` }).click();

      await expect(page).toHaveURL(new RegExp(path.replace(/[/.]/g, '\\$&') + '$'));
      await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();

      // The history table only renders once the real SQL Server-backed data loads.
      const observationRows = page.locator('table tbody tr');
      await expect(observationRows.first()).toBeVisible({ timeout: 15_000 });
      expect(await observationRows.count()).toBeGreaterThan(0);

      await expect(page.getByText('Loading official history...')).toHaveCount(0);

      await page.getByRole('button', { name: 'Back to overview' }).click();
      await expect(page).toHaveURL(/\/$/);
    });
  }
});
