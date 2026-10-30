import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

interface ChecklistTemplateRecord {
  id: string;
  name: string;
  items: { id: string; text: string }[];
}

interface ProjectRecord {
  id: string;
  name: string;
  code: string;
  planningEnabled: boolean;
  checklistAssigned: boolean;
}

interface ProjectChecklistRecord {
  name: string;
  items: { id: string; text: string; completed: boolean }[];
}

interface ReleaseAcknowledgement {
  acknowledged: boolean;
  acknowledgedAt: string | null;
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

test.describe('planning templates and project checklists', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('creates and edits a reusable checklist, applies it to a project, and persists the copied items', async ({
    page,
    request,
    app,
  }) => {
    const suffix = randomUUID();
    const initialTemplateName = `E2E Checklist ${suffix}`;
    const templateName = `${initialTemplateName} Updated`;
    const templateItem = `E2E planning item ${suffix}`;
    const projectName = `E2E Planning Project ${suffix}`;
    const projectCode = `E2E-${suffix.slice(0, 8).toUpperCase()}`;

    const invalidTemplate = await request.post(`${app.origin}/api/project-checklist-templates`, {
      headers: { origin: app.origin },
      data: { name: '   ', items: ['Valid item'] },
    });
    expect(invalidTemplate.status()).toBe(400);

    await openEnglishPage(page, `${app.origin}/planning`);
    await page.getByRole('button', { name: 'New checklist' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Checklist name').fill(initialTemplateName);
    await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('heading', { name: initialTemplateName })).toBeVisible();

    const templates = await getJson<ChecklistTemplateRecord[]>(
      request,
      `${app.origin}/api/project-checklist-templates`,
    );
    const template = templates.find((entry) => entry.name === initialTemplateName);
    if (!template)
      throw new Error(`Created checklist ${initialTemplateName} was missing from the API list`);

    await page.getByRole('button', { name: `Edit checklist: ${initialTemplateName}` }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByLabel('Checklist name').fill(templateName);
    await editDialog.getByRole('button', { name: 'Add item' }).click();
    await editDialog.getByRole('textbox', { name: 'Item 1' }).fill(templateItem);
    await editDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('heading', { name: templateName })).toBeVisible();

    const updatedTemplate = await getJson<ChecklistTemplateRecord>(
      request,
      `${app.origin}/api/project-checklist-templates/${template.id}`,
    );
    expect(updatedTemplate).toMatchObject({ name: templateName, items: [{ text: templateItem }] });

    const createProjectResponse = await request.post(`${app.origin}/api/projects`, {
      headers: { origin: app.origin },
      data: {
        name: projectName,
        code: projectCode,
        type: 'other',
        clientId: app.ids.clientId,
      },
    });
    expect(createProjectResponse.status()).toBe(201);
    const project = (await createProjectResponse.json()) as Pick<
      ProjectRecord,
      'id' | 'name' | 'code' | 'planningEnabled'
    >;
    expect(project).toMatchObject({
      name: projectName,
      code: projectCode,
      planningEnabled: false,
    });

    await page.goto(`${app.origin}/projects/${project.id}?section=settings`);
    await page.getByRole('switch', { name: 'Enable planning checklist' }).click();
    const templateSelect = page.getByLabel('Checklist template');
    await templateSelect.click();
    await page
      .locator('.ant-select-dropdown:visible')
      .getByText(templateName, { exact: true })
      .click();
    const projectPlanningUpdateResponse = page.waitForResponse(
      (response) =>
        response.url() === `${app.origin}/api/projects/${project.id}` &&
        response.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Enable checklist' }).click();
    const planningUpdateResponse = await projectPlanningUpdateResponse;
    expect(planningUpdateResponse.status()).toBe(200);

    const persistedProjectUrl = `${app.origin}/api/projects/${project.id}`;
    await expect
      .poll(
        async () => {
          const currentProject = await getJson<ProjectRecord>(request, persistedProjectUrl);
          return {
            planningEnabled: currentProject.planningEnabled,
            checklistAssigned: currentProject.checklistAssigned,
          };
        },
        { intervals: [100, 250, 500, 1000], timeout: 10_000 },
      )
      .toEqual({ planningEnabled: true, checklistAssigned: true });

    const persistedProject = await getJson<ProjectRecord>(request, persistedProjectUrl);
    expect(persistedProject).toMatchObject({ planningEnabled: true, checklistAssigned: true });
    const projectChecklistUrl = `${app.origin}/api/projects/${project.id}/checklist`;
    const projectChecklist = await getJson<ProjectChecklistRecord>(request, projectChecklistUrl);
    expect(projectChecklist.items.map((item) => item.text)).toContain(templateItem);

    await page.goto(`${app.origin}/projects/${project.id}?section=checklist`);
    await expect(page.getByRole('listitem').filter({ hasText: templateItem })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('listitem').filter({ hasText: templateItem })).toBeVisible();
  });
});

test.describe('planning permission boundaries', () => {
  test.use({ actor: 'readonly', scenario: 'configured', locale: 'en' });

  test('allows read-only planning access while rejecting template creation', async ({
    page,
    request,
    app,
  }) => {
    const templateName = `Forbidden checklist ${randomUUID()}`;
    await openEnglishPage(page, `${app.origin}/planning`);
    await expect(page.getByRole('heading', { name: 'Planning', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New checklist' })).toHaveCount(0);

    const response = await request.post(`${app.origin}/api/project-checklist-templates`, {
      headers: { origin: app.origin },
      data: { name: templateName, items: ['Forbidden item'] },
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden' });

    const templates = await getJson<ChecklistTemplateRecord[]>(
      request,
      `${app.origin}/api/project-checklist-templates`,
    );
    expect(templates.some((template) => template.name === templateName)).toBe(false);
  });
});

test.describe('release notice acknowledgement', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en', acknowledgeRelease: false });

  test('acknowledges the actual shipped release and preserves it across reloads', async ({
    page,
    request,
    app,
  }) => {
    const acknowledgementUrl = `${app.origin}/api/release-notes/${encodeURIComponent(app.currentReleaseVersion)}/acknowledgement`;

    await openEnglishPage(page, `${app.origin}/changelog`);
    const noticeDialog = page.getByRole('dialog').filter({ hasText: app.currentReleaseVersion });
    await expect(noticeDialog).toBeVisible();
    await expect(noticeDialog.getByRole('button', { name: 'OK' })).toBeVisible();
    await noticeDialog.getByRole('button', { name: 'OK' }).click();

    const acknowledgement = await getJson<ReleaseAcknowledgement>(request, acknowledgementUrl);
    expect(acknowledgement.acknowledged).toBe(true);
    expect(acknowledgement.acknowledgedAt).not.toBeNull();
    await expect(page.getByRole('heading', { name: 'Changelog', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: app.currentReleaseVersion, exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('dialog').filter({ hasText: app.currentReleaseVersion }),
    ).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Changelog', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: app.currentReleaseVersion, exact: true }),
    ).toBeVisible();
  });
});

test.describe('anonymous release acknowledgement boundary', () => {
  test.use({ actor: 'anonymous', scenario: 'configured', locale: 'en' });

  test('requires a session to read a release acknowledgement', async ({ request, app }) => {
    const response = await request.get(
      `${app.origin}/api/release-notes/${encodeURIComponent(app.currentReleaseVersion)}/acknowledgement`,
    );
    expect(response.status()).toBe(401);
  });
});
