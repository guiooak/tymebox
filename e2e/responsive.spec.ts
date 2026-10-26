import { expect, test, type Page } from '@playwright/test';
import { confirm, createFromTemplate, signIn, uniqueEmail } from './fixtures';

async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('fits a phone screen: Home, board and report, with the tab bar', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await signIn(page, uniqueEmail('eli'));
  const tabs = page.getByRole('navigation', { name: 'Main' });
  await expect(tabs).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
  await expectNoSideScroll(page);

  await createFromTemplate(page, 'Retro');
  await expectNoSideScroll(page);
  await page.getByRole('button', { name: 'Start event' }).click();
  await confirm(page, "Yes, let's go!");
  await expect(tabs.getByRole('link', { name: /Live/ })).toBeVisible();
  await expectNoSideScroll(page);

  await page.getByRole('button', { name: 'Finish event' }).click();
  await expect(page).toHaveURL(/\/report$/);
  await expectNoSideScroll(page);
});
