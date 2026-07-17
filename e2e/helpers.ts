import { Page } from '@playwright/test';

const MOBILE_BREAKPOINT = 768;

export function isMobileViewport(page: Page) {
  return (page.viewportSize()?.width ?? 1280) < MOBILE_BREAKPOINT;
}

/** Clicks a top-level header nav item (one that navigates directly, e.g. "Overview"). */
export async function clickHeaderItem(page: Page, label: string) {
  if (isMobileViewport(page)) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
  await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
}

/**
 * Opens a header dropdown and clicks an item inside it.
 *
 * Desktop must be hovered, not clicked: the parent button opens the dropdown
 * on mouseenter, and clicking it also fires its own onClick handler, which
 * toggles the same dropdown closed again (a single click nets to closed).
 * Mobile has no such handler — dropdown items are already inline once the
 * hamburger menu is open.
 *
 * The desktop "Data & Intelligence" dropdown buttons also render a topic
 * eyebrow and description alongside the label, so their accessible name is
 * the concatenation of all three — an exact match on just the label never
 * matches there. Mobile buttons render only the label, so exact matching
 * stays precise on that branch.
 */
export async function openHeaderDropdownItem(page: Page, parentLabel: string, itemLabel: string) {
  if (isMobileViewport(page)) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('navigation').getByRole('button', { name: itemLabel, exact: true }).click();
    return;
  }
  await page.getByRole('navigation').getByRole('button', { name: parentLabel, exact: true }).hover();
  await page.getByRole('navigation').getByRole('button', { name: itemLabel }).click();
}
