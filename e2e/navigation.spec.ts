import { test, expect } from '@playwright/test';
import { isMobileViewport, openHeaderDropdownItem } from './helpers';

test.describe('Site navigation', () => {
  test('home page loads with the hero and official indicators', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LAZA/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Official Indicators' })).toBeVisible();
  });

  test('home page shows featured executive insights with governance evidence', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Featured executive insights')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Featured Insights' })).toBeVisible();
    await expect(page.getByText('Rule-generated').first()).toBeVisible();
    await expect(page.getByText('Quality').first()).toBeVisible();
    await expect(page.getByText('GDP_DIVERSIFICATION_CONTRIBUTION_V1')).toBeVisible();
  });

  const advancedPages = [
    { item: 'Oil vs. Non-Oil GDP', path: '/intelligence/oil-vs-non-oil-gdp' },
    { item: 'Oil & Gas Production', path: '/intelligence/oil-gas-production' },
    { item: 'Fiscal Execution', path: '/intelligence/fiscal-execution' },
    { item: 'Sovereign Yield Curve', path: '/intelligence/sovereign-yield-curve' },
  ];

  for (const { item, path } of advancedPages) {
    test(`header navigates to "${item}"`, async ({ page }) => {
      await page.goto('/');
      await openHeaderDropdownItem(page, 'Data & Intelligence', item);
      await expect(page).toHaveURL(new RegExp(path.replace(/[/.]/g, '\\$&') + '$'));
      await expect(page.getByRole('heading', { level: 1, name: item })).toBeVisible();

      await page.getByRole('button', { name: 'Back to overview' }).click();
      await expect(page).toHaveURL(/\/$/);
    });
  }

  const institutionalPages = [
    { item: 'About us', path: '/institutional/about' },
    { item: 'Laza team', path: '/institutional/team' },
    { item: 'Contacts', path: '/institutional/contacts' },
  ];

  for (const { item, path } of institutionalPages) {
    test(`header navigates to institutional page "${item}"`, async ({ page }) => {
      await page.goto('/');
      await openHeaderDropdownItem(page, 'Institutional', item);
      await expect(page).toHaveURL(new RegExp(path.replace(/[/.]/g, '\\$&') + '$'));
    });
  }

  test('data marketplace is reachable from the header', async ({ page }) => {
    await page.goto('/');
    if (isMobileViewport(page)) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await page.getByRole('button', { name: 'Browse official data' }).click();
    } else {
      await page.getByRole('button', { name: 'Browse Data' }).click();
    }
    await expect(page).toHaveURL(/\/data$/);
  });

  test('indicator catalog is reachable from the header and opens indicator details', async ({ page }) => {
    await page.goto('/');
    if (isMobileViewport(page)) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
    }
    await page.getByRole('button', { name: 'Indicators', exact: true }).click();
    await expect(page).toHaveURL(/\/indicators$/);
    await expect(page.getByRole('heading', { level: 1, name: 'All Indicators' })).toBeVisible();
    await expect(page.getByText('Indicator catalog')).toBeVisible();

    await page.getByRole('article').filter({ hasText: 'GDP Growth' }).getByRole('button', { name: 'Open details' }).click();
    await expect(page).toHaveURL(/\/indicators\/gdp-growth$/);
    await expect(page.getByRole('heading', { name: 'GDP Growth Overview' })).toBeVisible();
  });

  test('data quality methodology page shows governed DQ content', async ({ page }) => {
    await page.goto('/methodology/data-quality');
    await expect(page).toHaveTitle(/Data Quality Methodology \| LAZA/);
    await expect(page.getByRole('heading', { level: 1, name: 'Data Quality Checks' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Publication gate' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Core DQ rules' })).toBeVisible();
    await expect(page.getByText('Economy Overview')).toHaveCount(0);
  });

  test('footer administrator link opens the admin login form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Administrator access' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();

    await page.getByRole('button', { name: 'Back to site' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
