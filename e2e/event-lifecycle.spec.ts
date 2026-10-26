import { expect, test } from '@playwright/test';
import { confirm, createFromTemplate, signIn, uniqueEmail } from './fixtures';

test('plan, run and finish an event, then read its report', async ({ page }) => {
  await signIn(page, uniqueEmail('ana'));
  await expect(page).toHaveURL(/\/$/);

  const id = await createFromTemplate(page, 'Retro');
  await page.getByRole('button', { name: 'Start event' }).click();
  await confirm(page, "Yes, let's go!");
  await expect(page.getByText('Live', { exact: false }).first()).toBeVisible();

  // Two milestones done, then a tangent parked for later.
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await page.getByRole('button', { name: '+ Add side topic' }).click();
  await page.keyboard.type('Budget for Q3');

  await page.getByRole('button', { name: 'Finish event' }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}/report$`));
  await expect(page.getByRole('heading', { name: 'Side topics' })).toBeVisible();
  await expect(page.getByText('Budget for Q3')).toBeVisible();
  await expect(page.getByText('Total duration')).toBeVisible();

  await page.getByRole('button', { name: 'Reopen event' }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}$`));
});
