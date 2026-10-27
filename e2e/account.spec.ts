import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { confirm, createFromTemplate, signIn, uniqueEmail } from './fixtures';

test('export your data, delete the account, and come back to nothing', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'The account menu is covered on desktop');
  const email = uniqueEmail('dora');
  await signIn(page, email);
  await createFromTemplate(page, 'Weekly planning');

  await page.getByRole('button', { name: /Account and preferences/ }).click();
  await page
    .getByRole('dialog', { name: 'Account' })
    .getByRole('button', { name: 'Privacy and data' })
    .click();
  const privacy = page.getByRole('dialog', { name: 'Privacy and data' });
  await expect(privacy.getByText('1 event')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    privacy.getByRole('button', { name: 'Export my data' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^tymebox-\d{4}-\d\d-\d\d\.json$/);
  const exported = JSON.parse(await readFile((await download.path()) as string, 'utf8'));
  expect(exported.account.email).toBe(email);
  expect(exported.events[0].event.name).toBe('Weekly planning');

  await privacy.getByRole('button', { name: 'Delete account' }).click();
  const deleting = page.getByRole('dialog', { name: 'Delete your account?' });
  await deleting.getByLabel('Type DELETE to confirm').fill('DELETE');
  await deleting.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByText('Account deleted')).toBeVisible();
  await confirm(page, 'OK');

  await signIn(page, email);
  await page.goto('/events');
  await expect(page.getByText('No events yet')).toBeVisible();
});
