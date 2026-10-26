import { expect, type Browser, type Page } from '@playwright/test';

/** A fresh, unique address per run, so tests never share an account. */
export function uniqueEmail(name: string): string {
  return `${name}.${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
}

/** Sign in through the emulator-only test field on the landing page. */
export async function signIn(page: Page, email: string, from = '/en'): Promise<void> {
  await page.goto(from);
  await page.getByLabel('Emulator: sign in as').fill(email);
  await page.getByRole('button', { name: 'Test sign-in' }).click();
  // Signed in once the landing (and its test field) is gone.
  await expect(page.getByRole('button', { name: 'Test sign-in' })).toHaveCount(0);
}

/** A separate browser profile, signed in as someone else. */
export async function personIn(browser: Browser, email: string, from?: string) {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await signIn(page, email, from);
  return { context, page };
}

/** From Home, create an event from a template and land on its board. */
export async function createFromTemplate(
  page: Page,
  template: 'Retro' | 'Weekly planning' | '1:1',
) {
  await page.getByRole('button', { name: new RegExp(`^${template}`) }).click();
  await expect(page).toHaveURL(/\/events\/[^/]+$/);
  return page.url().split('/').pop() as string;
}

/** Answer the app's own confirmation dialog. */
export async function confirm(page: Page, button: string): Promise<void> {
  await page.getByRole('dialog').getByRole('button', { name: button }).click();
}
