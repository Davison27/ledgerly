import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '../fixtures/test';

interface ProjectRecord {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  clientId: string;
  startDate: string | null;
  endDate: string | null;
}

interface ProjectSummaryRecord {
  id: string;
  name: string;
  code: string;
}

interface ChecklistRecord {
  id: string;
  text: string;
  completed: boolean;
}

interface ScheduleEventRecord {
  id: string;
  title: string | null;
  staff: { id: string }[];
}

async function getJson<T>(request: APIRequestContext, url: string): Promise<T> {
  const response = await request.get(url);
  expect(response.status()).toBe(200);
  return response.json() as Promise<T>;
}

test.describe('client and project lifecycle', () => {
  test.use({ actor: 'admin', scenario: 'configured' });

  test('creates, edits, archives, and restores a client and its project through the UI', async ({
    page,
    request,
    app,
  }) => {
    const suffix = Date.now().toString();
    const clientName = `E2E Client ${suffix}`;
    const projectName = `E2E Project ${suffix}`;
    const updatedProjectName = `${projectName} Updated`;

    await page.goto(`${app.origin}/companies`);
    await page.getByRole('button', { name: 'Add company' }).click();
    const clientDialog = page.getByRole('dialog');
    await clientDialog.getByLabel('Name').fill(clientName);
    await clientDialog.getByRole('button', { name: 'Create company' }).click();
    await expect(page.getByRole('link', { name: `Open projects: ${clientName}` })).toBeVisible();

    const clients = await getJson<{ id: string; name: string; archivedAt: string | null }[]>(
      request,
      `${app.origin}/api/clients`,
    );
    const client = clients.find((entry) => entry.name === clientName);
    if (!client) throw new Error(`Created client ${clientName} was missing from the API list`);

    await page.getByRole('link', { name: `Open projects: ${clientName}` }).click();
    await expect(page.getByRole('heading', { name: `Projects · ${clientName}` })).toBeVisible();
    const projectHeader = page
      .getByRole('heading', { name: `Projects · ${clientName}` })
      .locator('..');
    await projectHeader.getByRole('button', { name: 'Add' }).click();

    const projectDialog = page.getByRole('dialog');
    await projectDialog.getByLabel('Name').fill(projectName);
    await projectDialog.getByLabel('Code').fill(`E2E-${suffix}`);
    await projectDialog.getByLabel('Type').click();
    await page.locator('.ant-select-dropdown').getByText('Other', { exact: true }).click();
    await projectDialog.getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByRole('link', { name: projectName })).toBeVisible();

    const createdProjects = await getJson<ProjectSummaryRecord[]>(
      request,
      `${app.origin}/api/projects?clientId=${encodeURIComponent(client.id)}`,
    );
    const projectSummary = createdProjects.find((entry) => entry.name === projectName);
    if (!projectSummary)
      throw new Error(`Created project ${projectName} was missing from the API list`);

    const project = await getJson<ProjectRecord>(
      request,
      `${app.origin}/api/projects/${projectSummary.id}`,
    );
    expect(project.name).toBe(projectName);
    expect(project.clientId).toBe(client.id);
    expect(project.type).toBe('other');

    const projectCard = page.locator('.ant-card').filter({ hasText: projectName });
    await projectCard.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByLabel('Name').fill(updatedProjectName);
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('link', { name: updatedProjectName })).toBeVisible();

    const updatedProject = await getJson<ProjectRecord>(
      request,
      `${app.origin}/api/projects/${project.id}`,
    );
    expect(updatedProject.name).toBe(updatedProjectName);

    const documentName = `${updatedProjectName} archive reference`;
    const documentResponse = await request.post(
      `${app.origin}/api/projects/${project.id}/documents`,
      {
        headers: { origin: app.origin },
        multipart: {
          payload: JSON.stringify({
            name: documentName,
            type: 'invoice',
            date: new Date().toISOString().slice(0, 10),
            amount: 1,
            status: 'pending',
            direction: 'expense',
          }),
        },
      },
    );
    expect(documentResponse.status()).toBe(201);
    expect(await documentResponse.json()).toMatchObject({
      name: documentName,
      projectId: project.id,
    });

    const updatedCard = page.locator('.ant-card').filter({ hasText: updatedProjectName });
    await updatedCard.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    await expect(updatedCard).toHaveCount(0);

    const archivedProject = await getJson<ProjectRecord>(
      request,
      `${app.origin}/api/projects/${project.id}`,
    );
    expect(archivedProject.status).toBe('archived');

    await page.getByRole('switch', { name: 'Show archived' }).click();
    const archivedCard = page.locator('.ant-card').filter({ hasText: updatedProjectName });
    await expect(archivedCard).toBeVisible();
    await archivedCard.getByRole('button', { name: 'Actions' }).click();
    const unarchiveProjectResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/projects/${project.id}/unarchive`,
    );
    await page.getByRole('menuitem', { name: 'Unarchive' }).click();
    const unarchiveProjectResponse = await unarchiveProjectResponsePromise;
    expect(unarchiveProjectResponse.status()).toBe(201);
    await expect(page.getByRole('link', { name: updatedProjectName })).toBeVisible();
    expect(
      (await getJson<ProjectRecord>(request, `${app.origin}/api/projects/${project.id}`)).status,
    ).toBe('active');

    await page.goto(`${app.origin}/companies`);
    const activeClientCard = page.locator('.ant-card').filter({ hasText: clientName });
    await activeClientCard.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    await expect(activeClientCard).toHaveCount(0);

    const archivedClient = await getJson<{ id: string; archivedAt?: string | null }>(
      request,
      `${app.origin}/api/clients/${client.id}`,
    );
    expect(archivedClient.archivedAt).toEqual(expect.any(String));

    await page.getByRole('switch', { name: 'Show archived' }).click();
    const archivedClientCard = page.locator('.ant-card').filter({ hasText: clientName });
    await expect(archivedClientCard).toBeVisible();
    await archivedClientCard.getByRole('button', { name: 'Actions' }).click();
    const unarchiveClientResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/clients/${client.id}/unarchive`,
    );
    await page.getByRole('menuitem', { name: 'Unarchive' }).click();
    const unarchiveClientResponse = await unarchiveClientResponsePromise;
    expect(unarchiveClientResponse.status()).toBe(201);
    await expect(page.getByRole('link', { name: `Open projects: ${clientName}` })).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await getJson<{ archivedAt?: string | null }>(
              request,
              `${app.origin}/api/clients/${client.id}`,
            )
          ).archivedAt ?? null,
      )
      .toBeNull();

    await page.getByRole('link', { name: `Open projects: ${clientName}` }).click();
    const restoredProjectCard = page.locator('.ant-card').filter({ hasText: updatedProjectName });
    await restoredProjectCard.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const archiveProjectResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname === `/api/projects/${project.id}`,
    );
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    const archiveProjectResponse = await archiveProjectResponsePromise;
    expect(archiveProjectResponse.status()).toBe(200);
    expect(await archiveProjectResponse.json()).toMatchObject({ outcome: 'archived' });
    expect(
      (await getJson<ProjectRecord>(request, `${app.origin}/api/projects/${project.id}`)).status,
    ).toBe('archived');

    await page.goto(`${app.origin}/companies`);
    const finalClientCard = page.locator('.ant-card').filter({ hasText: clientName });
    await finalClientCard.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const finalClientDeleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname === `/api/clients/${client.id}`,
    );
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    const finalClientDeleteResponse = await finalClientDeleteResponsePromise;
    expect(finalClientDeleteResponse.status()).toBe(200);
    expect(await finalClientDeleteResponse.json()).toMatchObject({ outcome: 'archived' });
    expect(
      (
        await getJson<{ archivedAt?: string | null }>(
          request,
          `${app.origin}/api/clients/${client.id}`,
        )
      ).archivedAt,
    ).toEqual(expect.any(String));
  });
});

test.describe('project detail workflows', () => {
  test.use({ actor: 'admin', scenario: 'configured' });

  test('persists checklist edits and completion through reloads and API reads', async ({
    page,
    request,
    app,
  }) => {
    const checklistUrl = `${app.origin}/api/projects/${app.ids.projectId}/checklist`;
    const checklist = await getJson<{ name: string; items: ChecklistRecord[] }>(
      request,
      checklistUrl,
    );
    const suffix = Date.now().toString();
    const initialText = `E2E checklist item ${suffix}`;
    const updatedText = `${initialText} updated`;

    await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=checklist`);
    await page.getByRole('textbox', { name: 'Checklist item' }).fill(initialText);
    const addItemResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/projects/${app.ids.projectId}/checklist/items`,
    );
    await page.getByRole('button', { name: 'Add item' }).click();
    const addItemResponse = await addItemResponsePromise;
    expect(addItemResponse.status()).toBe(201);
    let item = (
      await getJson<{ name: string; items: ChecklistRecord[] }>(request, checklistUrl)
    ).items.find((entry) => entry.text === initialText);
    if (!item) throw new Error(`Checklist item ${initialText} was missing after creation`);

    const itemRow = page.getByRole('listitem').filter({ hasText: initialText });
    await expect(itemRow).toBeVisible();
    await itemRow.getByRole('button', { name: 'Edit item' }).click();
    await page.getByRole('textbox', { name: 'Edit item' }).fill(updatedText);
    await page.getByRole('button', { name: 'Save item' }).click();
    await page.reload();
    await expect(page.getByRole('listitem').filter({ hasText: updatedText })).toBeVisible();

    item = (
      await getJson<{ name: string; items: ChecklistRecord[] }>(request, checklistUrl)
    ).items.find((entry) => entry.text === updatedText);
    if (!item) throw new Error(`Checklist item ${updatedText} was missing after edit`);
    const incompleteCheckbox = page.getByRole('checkbox', {
      name: `Mark ${updatedText} as complete`,
    });
    await incompleteCheckbox.click();

    await expect
      .poll(async () => {
        const completedChecklist = await getJson<{ name: string; items: ChecklistRecord[] }>(
          request,
          checklistUrl,
        );
        return completedChecklist.items.find((entry) => entry.id === item.id)?.completed;
      })
      .toBe(true);
    await page.reload();
    const completedRow = page.getByRole('listitem').filter({ hasText: updatedText });
    await expect(
      completedRow.getByRole('checkbox', { name: `Mark ${updatedText} as incomplete` }),
    ).toBeChecked();
    const deleteChecklistItemResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname ===
          `/api/projects/${app.ids.projectId}/checklist/items/${item.id}`,
    );
    await completedRow.getByRole('button', { name: 'Delete item' }).click();
    const deleteChecklistItemResponse = await deleteChecklistItemResponsePromise;
    expect(deleteChecklistItemResponse.status()).toBe(204);

    const finalChecklist = await getJson<{ name: string; items: ChecklistRecord[] }>(
      request,
      checklistUrl,
    );
    expect(finalChecklist.items.some((entry) => entry.id === item.id)).toBe(false);
    expect(checklist.name).toBe(finalChecklist.name);
  });

  test('assigns and removes seeded equipment from the project', async ({ page, request, app }) => {
    const projectEquipmentUrl = `${app.origin}/api/projects/${app.ids.projectId}/equipment`;
    const equipmentList = await getJson<{ id: string; name: string }[]>(
      request,
      `${app.origin}/api/equipment`,
    );
    const equipment = equipmentList.find((item) => item.id === app.ids.equipmentId);
    if (!equipment)
      throw new Error(`Seeded equipment ${app.ids.equipmentId} was missing from the API list`);

    const before = await getJson<{ equipmentId: string; name: string }[]>(
      request,
      projectEquipmentUrl,
    );
    expect(before.some((item) => item.equipmentId === equipment.id)).toBe(false);

    await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=equipment`);
    await page.getByRole('button', { name: 'Add equipment' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Equipment').click();
    const equipmentDropdown = page.locator('.ant-select-dropdown');
    const equipmentOption = equipmentDropdown.getByText(equipment.name);
    await expect(equipmentOption).toBeVisible();
    await equipmentOption.click();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog).toBeHidden();

    const assigned = await getJson<{ equipmentId: string; name: string }[]>(
      request,
      projectEquipmentUrl,
    );
    expect(assigned.some((item) => item.equipmentId === equipment.id)).toBe(true);
    await page.reload();
    const equipmentRow = page.getByRole('row').filter({ hasText: equipment.name });
    await expect(equipmentRow).toBeVisible();
    await equipmentRow.getByRole('button', { name: 'Delete' }).click();
    await expect(equipmentRow).toHaveCount(0);

    const removed = await getJson<{ equipmentId: string }[]>(request, projectEquipmentUrl);
    expect(removed.some((item) => item.equipmentId === equipment.id)).toBe(false);
  });

  test('saves project settings and reloads the persisted project profile', async ({
    page,
    request,
    app,
  }) => {
    const projectUrl = `${app.origin}/api/projects/${app.ids.projectId}`;
    const project = await getJson<ProjectRecord>(request, projectUrl);
    const updatedName = `${project.name} Settings Check`;

    await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=settings`);
    await page.getByLabel('Name', { exact: true }).fill(updatedName);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect
      .poll(async () => (await getJson<ProjectRecord>(request, projectUrl)).name)
      .toBe(updatedName);
    await page.reload();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(updatedName);

    await page.getByLabel('Name', { exact: true }).fill(project.name);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect
      .poll(async () => (await getJson<ProjectRecord>(request, projectUrl)).name)
      .toBe(project.name);
  });
});

test.describe('calendar scheduling', () => {
  test.use({ actor: 'admin', scenario: 'configured' });

  test('rejects invalid intervals and staff assignments without saving events', async ({
    request,
    app,
  }) => {
    const project = await getJson<ProjectRecord>(
      request,
      `${app.origin}/api/projects/${app.ids.projectId}`,
    );
    if (!project.startDate || !project.endDate)
      throw new Error('The seeded project needs active dates for schedule validation coverage');

    const eventsUrl = `${app.origin}/api/schedule/events?from=${project.startDate}&to=${project.endDate}&projectId=${project.id}`;
    const initialEvents = await getJson<ScheduleEventRecord[]>(request, eventsUrl);
    expect(initialEvents).toHaveLength(0);

    const validStaffId = app.ids.staffMemberId;
    const unknownStaffId = randomUUID();
    const requests = [
      {
        payload: {
          projectId: project.id,
          title: 'E2E rejected interval',
          days: [{ date: project.startDate, startTime: '14:00', endTime: '09:00' }],
          staffMemberIds: [],
          equipment: [],
        },
        status: 400,
        error: {
          code: 'INVALID_VALUE',
          message: 'endTime must be after startTime',
        },
      },
      {
        payload: {
          projectId: project.id,
          title: 'E2E rejected duplicate staff assignment',
          days: [{ date: project.startDate }],
          staffMemberIds: [validStaffId, validStaffId],
          equipment: [],
        },
        status: 400,
        error: {
          code: 'INVALID_VALUE',
          message: 'a schedule event must not repeat the same staff member',
        },
      },
      {
        payload: {
          projectId: project.id,
          title: 'E2E rejected unknown staff assignment',
          days: [{ date: project.startDate }],
          staffMemberIds: [unknownStaffId],
          equipment: [],
        },
        status: 404,
        error: {
          code: 'ENTITY_NOT_FOUND',
          message: `StaffMember with id ${unknownStaffId} was not found`,
        },
      },
    ];

    for (const { payload, status, error } of requests) {
      const response = await request.post(`${app.origin}/api/schedule/events`, {
        data: payload,
      });

      expect(response.status()).toBe(status);
      expect(await response.json()).toEqual(error);
      expect(await getJson<ScheduleEventRecord[]>(request, eventsUrl)).toHaveLength(0);
    }
  });

  test('creates, edits, and deletes a schedule event from the project range and preserves staff assignment', async ({
    page,
    request,
    app,
  }) => {
    const project = await getJson<ProjectRecord>(
      request,
      `${app.origin}/api/projects/${app.ids.projectId}`,
    );
    if (!project.startDate || !project.endDate)
      throw new Error('The seeded project needs active dates for calendar coverage');
    const staffOptions = await getJson<{ id: string; displayName: string }[]>(
      request,
      `${app.origin}/api/schedule/editor/staff`,
    );
    const staff = staffOptions.find((item) => item.id === app.ids.staffMemberId);
    if (!staff)
      throw new Error(
        `Seeded staff member ${app.ids.staffMemberId} was missing from schedule options`,
      );

    const initialEvents = await getJson<ScheduleEventRecord[]>(
      request,
      `${app.origin}/api/schedule/events?from=${project.startDate}&to=${project.endDate}&projectId=${project.id}`,
    );
    expect(initialEvents).toHaveLength(0);

    const eventTitle = `E2E calendar event ${Date.now()}`;
    const updatedTitle = `${eventTitle} updated`;
    await page.goto(`${app.origin}/calendar`);
    const projectRange = page.getByText(project.name, { exact: true }).last();
    await expect(projectRange).toBeVisible();
    await projectRange.click();

    let editor = page.getByRole('dialog', { name: 'Edit block' });
    await expect(editor).toBeVisible();
    await editor.getByLabel('Title').fill(eventTitle);
    await editor.getByLabel('Staff').click();
    const staffDropdown = page.locator('.ant-select-dropdown');
    const staffOption = staffDropdown.getByText(staff.displayName);
    await expect(staffOption).toBeVisible();
    await staffOption.click();
    await editor.getByRole('button', { name: 'Save' }).click();
    await expect(editor).toBeHidden();

    let events = await getJson<ScheduleEventRecord[]>(
      request,
      `${app.origin}/api/schedule/events?from=${project.startDate}&to=${project.endDate}&projectId=${project.id}`,
    );
    let createdEvent = events.find((event) => event.title === eventTitle);
    if (!createdEvent)
      throw new Error(`Created schedule event ${eventTitle} was missing from the API board`);
    expect(createdEvent.staff.map((member) => member.id)).toContain(staff.id);

    await page.reload();
    await page.getByText(eventTitle, { exact: true }).last().click();
    editor = page.getByRole('dialog');
    await editor.getByLabel('Title').fill(updatedTitle);
    await editor.getByRole('button', { name: 'Save' }).click();
    await expect(editor).toBeHidden();

    events = await getJson<ScheduleEventRecord[]>(
      request,
      `${app.origin}/api/schedule/events?from=${project.startDate}&to=${project.endDate}&projectId=${project.id}`,
    );
    createdEvent = events.find((event) => event.title === updatedTitle);
    if (!createdEvent)
      throw new Error(`Updated schedule event ${updatedTitle} was missing from the API board`);
    expect(createdEvent.staff.map((member) => member.id)).toContain(staff.id);

    await page.reload();
    await page.getByText(updatedTitle, { exact: true }).last().click();
    editor = page.getByRole('dialog');
    await editor.getByRole('button', { name: 'Delete block' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    await expect(editor).toBeHidden();

    const finalEvents = await getJson<ScheduleEventRecord[]>(
      request,
      `${app.origin}/api/schedule/events?from=${project.startDate}&to=${project.endDate}&projectId=${project.id}`,
    );
    expect(finalEvents.some((event) => event.id === createdEvent.id)).toBe(false);
  });

  test('denies schedule creation to a viewer with a valid origin and authenticated session', async ({
    app,
  }) => {
    const adminRequest = await app.requestAs('admin');
    const project = await getJson<ProjectRecord>(
      adminRequest,
      `${app.origin}/api/projects/${app.ids.projectId}`,
    );
    if (!project.startDate)
      throw new Error('The seeded project needs a start date for permission coverage');

    const eventTitle = `E2E denied schedule event ${Date.now()}`;
    const eventsUrl = `${app.origin}/api/schedule/events?from=${project.startDate}&to=${project.startDate}&projectId=${project.id}`;
    const initialEvents = await getJson<ScheduleEventRecord[]>(adminRequest, eventsUrl);
    const viewerRequest = await app.requestAs('readonly');
    const response = await viewerRequest.post(`${app.origin}/api/schedule/events`, {
      data: {
        projectId: project.id,
        title: eventTitle,
        days: [{ date: project.startDate }],
        staffMemberIds: [],
        equipment: [],
      },
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({
      statusCode: 403,
      message: 'Forbidden',
    });
    const finalEvents = await getJson<ScheduleEventRecord[]>(adminRequest, eventsUrl);
    expect(finalEvents.map(({ id }) => id).sort()).toEqual(
      initialEvents.map(({ id }) => id).sort(),
    );
    expect(finalEvents.some(({ title }) => title === eventTitle)).toBe(false);
  });
});
