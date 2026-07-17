import { test, expect } from '@playwright/test';
import { openHeaderDropdownItem } from './helpers';

const advancedAnalyses = [
  { item: 'Oil vs. Non-Oil GDP', path: '/intelligence/oil-vs-non-oil-gdp', loadingText: 'Loading INE diversification intelligence...' },
  { item: 'Oil & Gas Production', path: '/intelligence/oil-gas-production', loadingText: 'Loading ANPG market intelligence...' },
  { item: 'Fiscal Execution', path: '/intelligence/fiscal-execution', loadingText: 'Loading MINFIN fiscal intelligence...' },
  { item: 'Sovereign Yield Curve', path: '/intelligence/sovereign-yield-curve', loadingText: 'Loading BODIVA sovereign curve...' },
];

test.describe('Advanced analytics pages', () => {
  for (const { item, path, loadingText } of advancedAnalyses) {
    test(`"${item}" loads real chart data`, async ({ page }) => {
      await page.goto('/');
      await openHeaderDropdownItem(page, 'Data & Intelligence', item);

      await expect(page).toHaveURL(new RegExp(path.replace(/[/.]/g, '\\$&') + '$'));
      await expect(page.getByRole('heading', { level: 1, name: item })).toBeVisible();

      await expect(page.getByText(loadingText)).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByText(/temporarily unavailable/i)).toHaveCount(0);
      await expect(page.locator('svg.recharts-surface').first()).toBeVisible();
    });
  }
});
