import { Buffer } from 'node:buffer';
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '../fixtures/test';

interface DocumentRecord {
  id: string;
  name: string;
  fileName: string | null;
  projectId: string;
  hasFile: boolean;
}

function createPdf(text: string): Buffer {
  const escapePdfText = (value: string) =>
    value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const stream = `BT /F1 12 Tf 50 760 Td (${escapePdfText(text)}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function listProjectDocuments(
  request: APIRequestContext,
  app: { origin: string; ids: { projectId: string } },
): Promise<DocumentRecord[]> {
  const response = await request.get(`${app.origin}/api/projects/${app.ids.projectId}/documents`);
  expect(response.status()).toBe(200);
  return response.json() as Promise<DocumentRecord[]>;
}

async function readDownload(download: import('@playwright/test').Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('The PDF download did not provide a readable stream');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test.describe('project documents', () => {
  test.use({ actor: 'admin', scenario: 'configured' });

  test('uploads a synthetic PDF, persists metadata and bytes, edits metadata, and deletes it', async ({
    page,
    request,
    app,
  }) => {
    const documentName = `E2E invoice ${Date.now()}`;
    const updatedName = `${documentName} updated`;
    const fileName = `${documentName.replaceAll(' ', '-')}.pdf`;
    const pdfBytes = createPdf('Synthetic invoice for an E2E test');
    const documentsUrl = `${app.origin}/api/projects/${app.ids.projectId}/documents`;

    await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=documents`);
    await page.getByRole('button', { name: 'Add document' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: pdfBytes,
    });
    await expect(dialog.getByRole('status')).toContainText('Ready for review');

    await dialog.getByLabel('Name', { exact: true }).fill(documentName);
    await dialog.getByLabel('Date', { exact: true }).fill('2026-10-28');
    await dialog.getByLabel('Amount', { exact: true }).fill('42.50');
    await dialog.getByLabel('Invoice number', { exact: true }).fill(`E2E-${Date.now()}`);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/projects/${app.ids.projectId}/documents`,
    );
    await dialog.getByRole('button', { name: 'Create document' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as DocumentRecord;
    expect(created).toMatchObject({
      name: documentName,
      projectId: app.ids.projectId,
      hasFile: true,
    });
    expect(created.fileName).toBe(fileName);

    await page.reload();
    await expect(page.getByText(documentName, { exact: true })).toBeVisible();
    const apiDocuments = await listProjectDocuments(request, app);
    expect(
      apiDocuments.some((document) => document.id === created.id && document.name === documentName),
    ).toBe(true);

    const fileResponse = await request.get(`${documentsUrl}/${created.id}/file`);
    expect(fileResponse.status()).toBe(200);
    expect(fileResponse.headers()['content-type']).toContain('application/pdf');
    expect(Buffer.from(await fileResponse.body())).toEqual(pdfBytes);

    await page.getByText(documentName, { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(fileName);
    expect(await readDownload(download)).toEqual(pdfBytes);

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByLabel('Name', { exact: true }).fill(updatedName);
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname ===
          `/api/projects/${app.ids.projectId}/documents/${created.id}`,
    );
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.status()).toBe(200);
    expect(await updateResponse.json()).toMatchObject({ id: created.id, name: updatedName });
    const updatedResponse = await request.get(`${documentsUrl}/${created.id}`);
    expect(updatedResponse.status()).toBe(200);
    expect(await updatedResponse.json()).toMatchObject({
      id: created.id,
      name: updatedName,
      hasFile: true,
    });

    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);
    const remainingDocuments = await listProjectDocuments(request, app);
    expect(remainingDocuments.some((document) => document.id === created.id)).toBe(false);
  });

  test('rejects invalid and infected files without creating document records', async ({
    page,
    request,
    app,
  }) => {
    const documentsPath = `/api/projects/${app.ids.projectId}/documents`;
    const documentsUrl = `${app.origin}${documentsPath}`;
    const invalidName = `E2E invalid ${Date.now()}.pdf`;
    const invalidResponse = await request.post(`${documentsUrl}/extract`, {
      multipart: {
        file: {
          name: invalidName,
          mimeType: 'application/pdf',
          buffer: Buffer.from('not a PDF'),
        },
      },
    });
    expect(invalidResponse.status()).toBe(400);
    expect(
      (await listProjectDocuments(request, app)).some(
        (document) => document.fileName === invalidName,
      ),
    ).toBe(false);

    const infectedName = `E2E infected ${Date.now()}`;
    const infectedBytes = Buffer.concat([
      createPdf('Synthetic infected document'),
      Buffer.from(app.infectedMarker),
    ]);
    await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=documents`);
    await page.getByRole('button', { name: 'Add document' }).click();
    const dialog = page.getByRole('dialog');
    const extractResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `${documentsPath}/extract`,
    );
    await dialog.locator('input[type="file"]').setInputFiles({
      name: `${infectedName}.pdf`,
      mimeType: 'application/pdf',
      buffer: infectedBytes,
    });
    const extractResponse = await extractResponsePromise;
    expect(extractResponse.status()).toBe(422);
    expect(await extractResponse.json()).toMatchObject({
      code: 'MALWARE_DETECTED',
      message: 'The uploaded file was rejected by the malware scanner',
    });
    await expect(dialog.getByRole('alert')).toContainText(
      'This PDF was rejected because a security threat was detected',
    );
    const after = await listProjectDocuments(request, app);
    expect(after.some((document) => document.name === infectedName)).toBe(false);
  });
});

test.describe('anonymous project document access', () => {
  test.use({ actor: 'anonymous', scenario: 'configured' });

  test('denies unauthenticated access to stored project document bytes', async ({
    app,
    request,
  }) => {
    const adminRequest = await app.requestAs('admin');
    const documentName = `E2E private document ${Date.now()}`;
    const fileName = `${documentName.replaceAll(' ', '-')}.pdf`;
    const pdfBytes = createPdf('Synthetic private document for an E2E test');
    const documentsUrl = `${app.origin}/api/projects/${app.ids.projectId}/documents`;
    const createResponse = await adminRequest.post(documentsUrl, {
      multipart: {
        payload: JSON.stringify({
          name: documentName,
          type: 'invoice',
          date: new Date().toISOString().slice(0, 10),
          amount: 1,
          status: 'pending',
          direction: 'expense',
        }),
        file: {
          name: fileName,
          mimeType: 'application/pdf',
          buffer: pdfBytes,
        },
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as DocumentRecord;
    expect(created).toMatchObject({
      name: documentName,
      projectId: app.ids.projectId,
      fileName,
      hasFile: true,
    });

    const authenticatedFile = await adminRequest.get(`${documentsUrl}/${created.id}/file`);
    expect(authenticatedFile.status()).toBe(200);
    expect(Buffer.from(await authenticatedFile.body())).toEqual(pdfBytes);

    const anonymousFile = await request.get(`${documentsUrl}/${created.id}/file`);
    expect(anonymousFile.status()).toBe(401);
    expect(anonymousFile.headers()['content-type']).not.toContain('application/pdf');
    expect(Buffer.from(await anonymousFile.body())).not.toEqual(pdfBytes);
  });
});
