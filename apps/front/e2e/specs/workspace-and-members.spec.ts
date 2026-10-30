import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

interface CompanyRecord {
  name: string;
  logo: string | null;
  [key: string]: unknown;
}

interface WorkspaceMemberRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'invited' | 'disabled';
}

interface TaxComplianceSettings {
  enabled: boolean;
}

interface TaxProfileRecord {
  projectId: string;
  entityType: string;
  regionCode: string | null;
  enabled: boolean;
  obligationKeys: string[];
}

interface ProjectRecord {
  id: string;
  name: string;
  code: string;
}

async function openEnglishPage(page: Page, url: string): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'en'));
  await page.goto(url);
}

async function getJson<T>(request: APIRequestContext, url: string): Promise<T> {
  const response = await request.get(url);
  expect(response.status()).toBe(200);
  return response.json() as Promise<T>;
}

function memberRow(page: Page, email: string) {
  return page.getByRole('row').filter({ hasText: email });
}

test.describe('workspace company profile', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('saves company identity and logo through the singleton workspace profile', async ({
    page,
    request,
    app,
  }) => {
    const suffix = randomUUID();
    const updatedName = `E2E Workspace ${suffix}`;
    const logoBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c2ioAAAAASUVORK5CYII=',
      'base64',
    );

    await openEnglishPage(page, `${app.origin}/workspace?tab=company`);
    await expect(page.getByRole('heading', { name: 'Workspace' })).toBeVisible();
    await page.getByLabel('Commercial name').fill(updatedName);
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'synthetic-brand.png',
      mimeType: 'image/png',
      buffer: logoBytes,
    });
    await expect(page.getByRole('img', { name: 'Logo' })).toBeVisible();
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    const company = await getJson<CompanyRecord>(request, `${app.origin}/api/company`);
    expect(company.name).toBe(updatedName);
    expect(company.logo).toMatch(/^data:image\/png;base64,/);

    await page.reload();
    await expect(page.getByLabel('Commercial name')).toHaveValue(updatedName);
    await expect(page.getByRole('img', { name: 'Logo' })).toBeVisible();
  });
});

test.describe('workspace member invitations and access', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('invites a member, changes role, and deactivates the account', async ({
    page,
    request,
    app,
  }) => {
    const suffix = randomUUID();
    const name = `E2E Workspace Member ${suffix}`;
    const email = `e2e-${suffix}@example.invalid`;

    await openEnglishPage(page, `${app.origin}/workspace?tab=members`);
    await page.getByRole('button', { name: 'Invite person' }).click();
    const inviteDialog = page.getByRole('dialog');
    await inviteDialog.getByLabel('Name').fill(name);
    await inviteDialog.getByLabel('Email').fill(email);
    await inviteDialog.getByRole('radio', { name: 'Member' }).check();
    await inviteDialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(memberRow(page, email)).toBeVisible();

    const members = await getJson<WorkspaceMemberRecord[]>(
      request,
      `${app.origin}/api/workspace/members`,
    );
    const member = members.find((entry) => entry.email === email);
    if (!member) throw new Error(`Invited member ${email} was missing from the workspace API list`);
    expect(member.role).toBe('member');
    expect(member.status).toBe('invited');

    const invitedRow = memberRow(page, email);
    await invitedRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit access' }).click();
    const editDialog = page.getByRole('dialog');
    const administratorRadio = editDialog.getByRole('radio', { name: 'Administrator' });
    await administratorRadio.click();
    await expect(administratorRadio).toBeChecked();
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/workspace/members/${member.id}`,
    );
    await editDialog.getByRole('button', { name: 'Save access' }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.status()).toBe(200);
    expect(await updateResponse.json()).toMatchObject({ id: member.id, role: 'admin' });
    await expect
      .poll(
        async () =>
          (
            await getJson<WorkspaceMemberRecord[]>(request, `${app.origin}/api/workspace/members`)
          ).find((entry) => entry.id === member.id)?.role,
      )
      .toBe('admin');

    await memberRow(page, email).getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Deactivate' }).click();
    await page.getByRole('button', { name: 'Deactivate', exact: true }).last().click();
    await expect(memberRow(page, email)).toContainText('Deactivated');
    expect(
      (await getJson<WorkspaceMemberRecord[]>(request, `${app.origin}/api/workspace/members`)).find(
        (entry) => entry.id === member.id,
      )?.status,
    ).toBe('disabled');
  });
});

test.describe('workspace integration catalogue and tax profiles', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('shows the local integration catalogue and persists tax settings and a project profile', async ({
    page,
    request,
    app,
  }) => {
    await openEnglishPage(page, `${app.origin}/workspace?tab=integrations`);
    await expect(page.getByRole('heading', { name: 'Integrations', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Google Workspace', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect' }).first()).toBeVisible();

    await page.goto(`${app.origin}/workspace?tab=tax-compliance`);
    const settingsUrl = `${app.origin}/api/tax-compliance/settings`;
    const settings = await getJson<TaxComplianceSettings>(request, settingsUrl);
    const enabledSwitch = page.getByRole('switch', { name: 'Enable tax calendar' });
    if (settings.enabled) {
      await enabledSwitch.click();
      await expect
        .poll(async () => (await getJson<TaxComplianceSettings>(request, settingsUrl)).enabled)
        .toBe(false);
    }
    await enabledSwitch.click();
    await expect
      .poll(async () => (await getJson<TaxComplianceSettings>(request, settingsUrl)).enabled)
      .toBe(true);

    const project = await getJson<ProjectRecord>(
      request,
      `${app.origin}/api/projects/${app.ids.projectId}`,
    );
    const projectRow = page.getByRole('row').filter({ hasText: project.name });
    await expect(projectRow).toBeVisible();
    await projectRow.getByRole('button', { name: 'Configure' }).click();
    const profileDialog = page.getByRole('dialog');
    const clientType = profileDialog.getByLabel('Client type');
    await clientType.click();
    await page
      .locator('.ant-select-dropdown:visible')
      .getByText('Company', { exact: true })
      .click();
    await profileDialog.getByLabel('Region or autonomous community').fill('MD');
    const form303 = profileDialog.getByRole('checkbox', { name: /Form 303 · Quarterly VAT/ });
    await form303.click();
    await expect(form303).toBeChecked();
    const profileResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/tax-compliance/profiles/${project.id}`,
    );
    await profileDialog.getByRole('button', { name: 'Save', exact: true }).click();
    const profileResponse = await profileResponsePromise;
    expect(profileResponse.status()).toBe(200);

    const profiles = await getJson<TaxProfileRecord[]>(
      request,
      `${app.origin}/api/tax-compliance/profiles`,
    );
    const profile = profiles.find((entry) => entry.projectId === project.id);
    if (!profile)
      throw new Error(`Tax profile for project ${project.id} was missing from the API list`);
    expect(profile).toMatchObject({
      entityType: 'company',
      regionCode: 'MD',
      enabled: true,
    });
    expect(profile.obligationKeys).toContain('es-aeat-model-303-quarterly');

    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: project.name })).toContainText(
      'Configured',
    );
    if (!settings.enabled) {
      await page.getByRole('switch', { name: 'Enable tax calendar' }).click();
      await expect
        .poll(async () => (await getJson<TaxComplianceSettings>(request, settingsUrl)).enabled)
        .toBe(false);
    }
  });
});

test.describe('workspace administration boundaries', () => {
  test.use({ actor: 'readonly', scenario: 'configured', locale: 'en' });

  test('keeps workspace administration routes and APIs unavailable to a read-only member', async ({
    page,
    request,
    app,
  }) => {
    await openEnglishPage(page, `${app.origin}/workspace?tab=company`);
    await expect(page).toHaveURL(/\/workspace\?tab=company$/);
    await expect(
      page.getByText('You do not have access to this section', { exact: true }),
    ).toBeVisible();

    const companyResponse = await request.get(`${app.origin}/api/company`);
    expect(companyResponse.status()).toBe(403);
    const membersResponse = await request.get(`${app.origin}/api/workspace/members`);
    expect(membersResponse.status()).toBe(403);
    const taxSettingsResponse = await request.get(`${app.origin}/api/tax-compliance/settings`);
    expect(taxSettingsResponse.status()).toBe(403);
    expect(await taxSettingsResponse.json()).toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });
  });
});
