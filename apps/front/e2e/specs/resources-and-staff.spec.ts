import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

interface SupplierRecord {
  id: string;
  name: string;
  archivedAt: string | null;
}

interface EquipmentRecord {
  id: string;
  name: string;
  category: string | null;
  archivedAt: string | null;
}

interface EquipmentDocumentRecord {
  id: string;
  name: string;
}

interface StaffRecord {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  archivedAt: string | null;
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

function supplierRow(page: Page, name: string) {
  return page.getByRole('row').filter({ hasText: name });
}

function equipmentCard(page: Page, name: string) {
  return page.locator('.ant-card').filter({ hasText: name });
}

function staffRow(page: Page, name: string) {
  return page.getByRole('row').filter({ hasText: name });
}

function requireRecord<T extends { id: string }>(records: T[], id: string, entity: string): T {
  const record = records.find((entry) => entry.id === id);
  if (!record) throw new Error(`${entity} ${id} was missing from the API list`);
  return record;
}

test.describe('supplier lifecycle and linked documents', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('creates, edits, archives, restores, and filters a supplier-linked invoice', async ({
    page,
    request,
    app,
  }) => {
    const suffix = randomUUID();
    const supplierName = `E2E Supplier ${suffix}`;
    const updatedSupplierName = `${supplierName} Updated`;
    const taxId = `E2E-${suffix}`;
    const invoiceName = `E2E Supplier Invoice ${suffix}`;

    await openEnglishPage(page, `${app.origin}/suppliers`);
    await page.getByRole('button', { name: 'Add supplier' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Name').fill(supplierName);
    await createDialog.getByLabel('Tax ID').fill(taxId);
    await createDialog.getByRole('button', { name: 'Create supplier' }).click();
    await expect(supplierRow(page, supplierName)).toBeVisible();

    const suppliers = await getJson<SupplierRecord[]>(request, `${app.origin}/api/suppliers`);
    const supplier = suppliers.find((entry) => entry.name === supplierName);
    if (!supplier)
      throw new Error(`Created supplier ${supplierName} was missing from the API list`);

    await page.getByRole('button', { name: 'Add supplier' }).click();
    const duplicateDialog = page.getByRole('dialog');
    await duplicateDialog.getByLabel('Name').fill(`E2E Duplicate ${suffix}`);
    await duplicateDialog.getByLabel('Tax ID').fill(taxId);
    await duplicateDialog.getByRole('button', { name: 'Create supplier' }).click();
    await expect(page.getByText('A supplier with that tax ID already exists.')).toBeVisible();
    await duplicateDialog.getByRole('button', { name: 'Cancel' }).click();

    const invoiceResponse = await request.post(
      `${app.origin}/api/projects/${app.ids.projectId}/documents`,
      {
        headers: { origin: app.origin },
        multipart: {
          payload: JSON.stringify({
            name: invoiceName,
            type: 'invoice',
            date: new Date().toISOString().slice(0, 10),
            amount: 1,
            status: 'pending',
            direction: 'expense',
            supplierId: supplier.id,
          }),
        },
      },
    );
    expect(invoiceResponse.status()).toBe(201);

    await page.reload();
    const supplierListRow = supplierRow(page, supplierName);
    await expect(supplierListRow.getByRole('link')).toBeVisible();
    await supplierListRow.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByLabel('Name').fill(updatedSupplierName);
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(supplierRow(page, updatedSupplierName)).toBeVisible();
    expect(
      (await getJson<SupplierRecord[]>(request, `${app.origin}/api/suppliers`)).find(
        (entry) => entry.id === supplier.id,
      )?.name,
    ).toBe(updatedSupplierName);

    const updatedSupplierRow = supplierRow(page, updatedSupplierName);
    await updatedSupplierRow.getByRole('link').click();
    const supplierDocumentsUrl = new URL(page.url());
    expect(supplierDocumentsUrl.pathname).toBe('/documents');
    expect(supplierDocumentsUrl.searchParams.get('supplierId')).toBe(supplier.id);
    await expect(page.getByText(invoiceName, { exact: true })).toBeVisible();

    await page.goto(`${app.origin}/suppliers`);
    const activeRow = supplierRow(page, updatedSupplierName);
    await activeRow.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    await expect(activeRow).toHaveCount(0);
    const archivedSupplier = requireRecord(
      await getJson<SupplierRecord[]>(request, `${app.origin}/api/suppliers`),
      supplier.id,
      'Supplier',
    );
    expect(archivedSupplier.archivedAt ?? null).not.toBeNull();

    await page.getByRole('switch', { name: 'Show archived' }).click();
    const archivedRow = supplierRow(page, updatedSupplierName);
    await expect(archivedRow).toBeVisible();
    await archivedRow.getByRole('button', { name: 'Unarchive' }).click();
    await expect(supplierRow(page, updatedSupplierName)).toBeVisible();
    expect(
      requireRecord(
        await getJson<SupplierRecord[]>(request, `${app.origin}/api/suppliers`),
        supplier.id,
        'Supplier',
      ).archivedAt ?? null,
    ).toBeNull();
  });
});

test.describe('equipment and project assignment', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('edits, assigns, archives, restores, and manages an equipment PDF', async ({
    page,
    request,
    app,
  }) => {
    const suffix = randomUUID();
    const equipmentName = `E2E Equipment ${suffix}`;
    const updatedEquipmentName = `${equipmentName} Updated`;
    const pdfName = `E2E Equipment Manual ${suffix}`;
    const pdfBytes = Buffer.from('%PDF-1.4\nLedgerly synthetic equipment document\n%%EOF', 'utf8');

    await openEnglishPage(page, `${app.origin}/equipment`);
    await page.getByRole('button', { name: 'New equipment' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Name').fill(equipmentName);
    await createDialog.getByLabel('Category').fill('Synthetic equipment');
    await createDialog.getByRole('button', { name: 'Create equipment' }).click();
    await expect(equipmentCard(page, equipmentName)).toBeVisible();

    const equipmentList = await getJson<EquipmentRecord[]>(request, `${app.origin}/api/equipment`);
    const equipment = equipmentList.find((entry) => entry.name === equipmentName);
    if (!equipment)
      throw new Error(`Created equipment ${equipmentName} was missing from the API list`);

    await equipmentCard(page, equipmentName).getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByLabel('Name').fill(updatedEquipmentName);
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(equipmentCard(page, updatedEquipmentName)).toBeVisible();
    expect(
      (await getJson<EquipmentRecord[]>(request, `${app.origin}/api/equipment`)).find(
        (entry) => entry.id === equipment.id,
      )?.name,
    ).toBe(updatedEquipmentName);

    await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=equipment`);
    await page.getByRole('button', { name: 'Add equipment' }).click();
    const assignmentDialog = page.getByRole('dialog');
    await assignmentDialog.getByLabel('Equipment').click();
    await page
      .locator('.ant-select-dropdown:visible')
      .getByText(updatedEquipmentName, { exact: true })
      .click();
    await expect(assignmentDialog.getByText(updatedEquipmentName, { exact: true })).toBeVisible();
    const assignmentResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/projects/${app.ids.projectId}/equipment`,
    );
    await assignmentDialog.getByRole('button', { name: 'Add', exact: true }).click();
    const assignmentResponse = await assignmentResponsePromise;
    expect(assignmentResponse.status()).toBe(201);
    const projectEquipment = await getJson<{ equipmentId: string; name: string }[]>(
      request,
      `${app.origin}/api/projects/${app.ids.projectId}/equipment`,
    );
    expect(projectEquipment.some((entry) => entry.equipmentId === equipment.id)).toBe(true);
    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: updatedEquipmentName })).toBeVisible();

    await page.goto(`${app.origin}/equipment`);
    await equipmentCard(page, updatedEquipmentName).click();
    const detailDialog = page.getByRole('dialog').filter({ hasText: updatedEquipmentName });
    await expect(detailDialog.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await detailDialog.getByRole('button', { name: 'Add PDF' }).click();
    const uploadDialog = page.getByRole('dialog').filter({ hasText: 'Add equipment document' });
    await uploadDialog.getByLabel('Display name').fill(pdfName);
    await uploadDialog.locator('input[type="file"]').setInputFiles({
      name: 'equipment-manual.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBytes,
    });
    await uploadDialog.getByRole('button', { name: 'Save' }).click();
    await expect(detailDialog.getByText(pdfName, { exact: true })).toBeVisible();

    const documents = await getJson<EquipmentDocumentRecord[]>(
      request,
      `${app.origin}/api/equipment/${equipment.id}/documents`,
    );
    const document = documents.find((entry) => entry.name === pdfName);
    if (!document)
      throw new Error(`Uploaded equipment document ${pdfName} was missing from the API list`);
    const download = await request.get(
      `${app.origin}/api/equipment/${equipment.id}/documents/${document.id}/file`,
    );
    expect(download.status()).toBe(200);
    expect(await download.body()).toEqual(pdfBytes);

    const documentItem = detailDialog
      .getByText(pdfName, { exact: true })
      .locator('xpath=ancestor::li');
    const deleteDocumentResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname ===
          `/api/equipment/${equipment.id}/documents/${document.id}`,
    );
    await documentItem.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    expect((await deleteDocumentResponsePromise).status()).toBe(204);
    expect(
      await getJson<EquipmentDocumentRecord[]>(
        request,
        `${app.origin}/api/equipment/${equipment.id}/documents`,
      ),
    ).toEqual([]);

    await page.goto(`${app.origin}/equipment`);
    const activeCard = equipmentCard(page, updatedEquipmentName);
    await activeCard.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const archiveEquipmentResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname === `/api/equipment/${equipment.id}`,
    );
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    expect((await archiveEquipmentResponsePromise).status()).toBe(200);
    const archivedEquipment = requireRecord(
      await getJson<EquipmentRecord[]>(request, `${app.origin}/api/equipment`),
      equipment.id,
      'Equipment',
    );
    expect(archivedEquipment.archivedAt ?? null).not.toBeNull();

    await page.getByRole('switch', { name: 'Show archived' }).click();
    const archivedCard = equipmentCard(page, updatedEquipmentName);
    await expect(archivedCard).toBeVisible();
    await archivedCard.getByRole('button', { name: 'Actions' }).click();
    const unarchiveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/equipment/${equipment.id}/unarchive`,
    );
    await page.getByRole('menuitem', { name: 'Unarchive' }).click();
    const unarchiveResponse = await unarchiveResponsePromise;
    expect(unarchiveResponse.status()).toBe(201);
    expect(await unarchiveResponse.json()).toEqual({ outcome: 'unarchived' });
    await expect(equipmentCard(page, updatedEquipmentName)).toBeVisible();
    expect(
      requireRecord(
        await getJson<EquipmentRecord[]>(request, `${app.origin}/api/equipment`),
        equipment.id,
        'Equipment',
      ).archivedAt ?? null,
    ).toBeNull();
  });
});

test.describe('staff records and scoped profile access', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('creates, edits, deletes an unreferenced staff member and visits the seeded staff detail sections', async ({
    page,
    request,
    app,
  }) => {
    const suffix = randomUUID();
    const firstName = 'E2E';
    const lastName = `Staff ${suffix}`;
    const fullName = `${firstName} ${lastName}`;

    await openEnglishPage(page, `${app.origin}/staff`);
    await page.getByRole('button', { name: 'Add staff member' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('First name').fill(firstName);
    await createDialog.getByLabel('Last name').fill(lastName);
    await createDialog.getByLabel('Position').fill('Synthetic operator');
    await createDialog.getByRole('button', { name: 'Create staff member' }).click();
    await expect(staffRow(page, fullName)).toBeVisible();

    const staffList = await getJson<StaffRecord[]>(request, `${app.origin}/api/staff`);
    const createdStaff = staffList.find(
      (entry) => entry.firstName === firstName && entry.lastName === lastName,
    );
    if (!createdStaff)
      throw new Error(`Created staff member ${fullName} was missing from the API list`);

    await staffRow(page, fullName).getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByLabel('Position').fill('Updated synthetic operator');
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/staff/${createdStaff.id}`,
    );
    await editDialog.getByRole('button', { name: 'Save' }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.status()).toBe(200);
    expect(await updateResponse.json()).toMatchObject({
      id: createdStaff.id,
      position: 'Updated synthetic operator',
    });
    expect(
      (await getJson<StaffRecord[]>(request, `${app.origin}/api/staff`)).find(
        (entry) => entry.id === createdStaff.id,
      )?.position,
    ).toBe('Updated synthetic operator');

    await staffRow(page, fullName).getByRole('button', { name: 'Delete' }).click();
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname === `/api/staff/${createdStaff.id}`,
    );
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBe(200);
    expect(await deleteResponse.json()).toEqual({ outcome: 'deleted' });
    expect(
      (await getJson<StaffRecord[]>(request, `${app.origin}/api/staff`)).some(
        (entry) => entry.id === createdStaff.id,
      ),
    ).toBe(false);

    const seededStaff = (await getJson<StaffRecord[]>(request, `${app.origin}/api/staff`)).find(
      (entry) => entry.id === app.ids.staffMemberId,
    );
    if (!seededStaff)
      throw new Error(`Seeded staff member ${app.ids.staffMemberId} was missing from the API list`);
    const seededName = `${seededStaff.firstName} ${seededStaff.lastName}`;
    await page.goto(`${app.origin}/staff/${seededStaff.id}?section=documents`);
    await expect(page.getByRole('heading', { name: seededName })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/staff/${seededStaff.id}\\?section=documents`));
    await expect(page.getByRole('radio', { name: 'Documents' })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Coming soon' })).toBeDisabled();

    for (const section of ['Payrolls', 'Schedule']) {
      await page.locator('.ant-segmented-item').filter({ hasText: section }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.toLowerCase()}`));
      if (section === 'Payrolls') {
        await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
      } else {
        await expect(
          page.getByText('This staff member has no schedule blocks assigned yet.', { exact: true }),
        ).toBeVisible();
      }
    }

    await page.goto(`${app.origin}/staff`);
    const seededRow = staffRow(page, seededName);
    await seededRow.getByRole('button', { name: 'Delete' }).click();
    const archiveResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${app.origin}/api/staff/${seededStaff.id}` &&
        response.request().method() === 'DELETE',
    );
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    const archiveResponse = await archiveResponsePromise;
    expect(archiveResponse.status()).toBe(200);
    expect(await archiveResponse.json()).toEqual({ outcome: 'archived' });
    const archivedStaff = requireRecord(
      await getJson<StaffRecord[]>(request, `${app.origin}/api/staff`),
      seededStaff.id,
      'Staff member',
    );
    expect(archivedStaff.archivedAt ?? null).not.toBeNull();

    await page.getByRole('switch', { name: 'Show archived' }).click();
    const archivedRow = staffRow(page, seededName);
    await expect(archivedRow).toBeVisible();
    const restoreResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${app.origin}/api/staff/${seededStaff.id}/unarchive` &&
        response.request().method() === 'POST',
    );
    await archivedRow.getByRole('button', { name: 'Unarchive' }).click();
    const restoreResponse = await restoreResponsePromise;
    expect(restoreResponse.status()).toBe(201);
    expect(await restoreResponse.json()).toEqual({ outcome: 'unarchived' });
    expect(
      requireRecord(
        await getJson<StaffRecord[]>(request, `${app.origin}/api/staff`),
        seededStaff.id,
        'Staff member',
      ).archivedAt ?? null,
    ).toBeNull();
  });
});

test.describe('resource permission boundaries', () => {
  test.use({ actor: 'readonly', scenario: 'configured', locale: 'en' });

  test('keeps resource controls read-only and rejects mutation requests for a view-only member', async ({
    page,
    request,
    app,
  }) => {
    await openEnglishPage(page, `${app.origin}/equipment`);
    await expect(page.getByRole('heading', { name: 'Equipment' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New equipment' })).toHaveCount(0);
    const equipmentResponse = await request.post(`${app.origin}/api/equipment`, {
      headers: { origin: app.origin },
      data: { name: `Forbidden equipment ${randomUUID()}` },
    });
    expect(equipmentResponse.status()).toBe(403);

    await page.goto(`${app.origin}/suppliers`);
    await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add supplier' })).toHaveCount(0);
    const supplierResponse = await request.post(`${app.origin}/api/suppliers`, {
      headers: { origin: app.origin },
      data: { name: `Forbidden supplier ${randomUUID()}` },
    });
    expect(supplierResponse.status()).toBe(403);
  });
});

test.describe('staff profile-only access', () => {
  test.use({ actor: 'staffProfileOnly', scenario: 'configured', locale: 'en' });

  test('redirects a document-section deep link to the profile and denies staff documents', async ({
    page,
    request,
    app,
  }) => {
    await openEnglishPage(page, `${app.origin}/staff/${app.ids.staffMemberId}?section=documents`);
    await expect(page).toHaveURL(new RegExp(`/staff/${app.ids.staffMemberId}\\?section=profile`));
    await expect(page.getByRole('radio', { name: 'Profile' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Documents' })).toHaveCount(0);

    const documentsResponse = await request.get(
      `${app.origin}/api/staff/${app.ids.staffMemberId}/documents`,
    );
    expect(documentsResponse.status()).toBe(403);
    expect(await documentsResponse.json()).toEqual({
      statusCode: 403,
      message: 'Forbidden',
    });
  });
});

test.describe('anonymous resource boundaries', () => {
  test.use({ actor: 'anonymous', scenario: 'configured', locale: 'en' });

  test('requires a session for staff and equipment document APIs', async ({ request, app }) => {
    const staffDocuments = await request.get(
      `${app.origin}/api/staff/${app.ids.staffMemberId}/documents`,
    );
    expect(staffDocuments.status()).toBe(401);
    const equipmentDocuments = await request.get(
      `${app.origin}/api/equipment/${app.ids.equipmentId}/documents`,
    );
    expect(equipmentDocuments.status()).toBe(401);
  });
});
