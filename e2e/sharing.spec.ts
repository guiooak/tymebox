import { expect, test } from '@playwright/test';
import { confirm, createFromTemplate, personIn, signIn, uniqueEmail } from './fixtures';

test('share with a viewer, then let a requester in as a contributor', async ({
  page,
  browser,
}) => {
  const bruno = uniqueEmail('bruno');
  const carla = uniqueEmail('carla');

  // Ana plans an event and shares it with Bruno, read-only.
  await signIn(page, uniqueEmail('ana'));
  const id = await createFromTemplate(page, '1:1');
  await page.getByRole('button', { name: /^Share/ }).click();
  const share = page.getByRole('dialog', { name: /^Share/ });
  await share.getByLabel('Email to share with').fill(bruno);
  await share.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(share.getByText(bruno)).toBeVisible();
  await share.getByRole('button', { name: 'Done' }).click();

  // Bruno finds it under "Shared with me" and can only follow along.
  const asBruno = await personIn(browser, bruno);
  await asBruno.page
    .getByRole('region', { name: 'Shared with me' })
    .getByText('1:1', { exact: true })
    .click();
  await expect(asBruno.page).toHaveURL(new RegExp(`/events/${id}$`));
  await expect(asBruno.page.getByText('View only')).toBeVisible();
  await expect(asBruno.page.getByRole('button', { name: 'Start event' })).toHaveCount(0);

  // Carla opens the link and asks to join.
  const asCarla = await personIn(browser, carla, `/events/${id}`);
  await expect(asCarla.page).toHaveURL(new RegExp(`/events/${id}$`));
  await asCarla.page.getByRole('button', { name: 'Request access' }).click();
  await expect(asCarla.page.getByText('Request sent')).toBeVisible();

  // Ana approves her as a contributor.
  await page.getByRole('button', { name: /^Share — 1 access request waiting/ }).click();
  await share.getByRole('combobox', { name: `Role for ${carla}` }).click();
  await page.getByRole('option', { name: /^Contributor/ }).click();
  await share.getByRole('button', { name: 'Approve' }).click();
  await expect(share.getByText(carla)).toBeVisible();

  // Carla's page opens the board by itself, and she can run it.
  await asCarla.page.getByRole('button', { name: 'Start event' }).click();
  await confirm(asCarla.page, "Yes, let's go!");
  await asCarla.page.getByRole('button', { name: 'Mark as done' }).click();
  await expect(page.getByText('2 of 3')).toBeVisible();

  await asBruno.context.close();
  await asCarla.context.close();
});
