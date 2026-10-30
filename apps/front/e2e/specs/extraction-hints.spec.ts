import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '../fixtures/test';

interface ExtractionHintRecord {
  id: string;
  issuerName: string;
  field: string;
  anchorKind: string;
  anchorLabel: string;
  sampleValue: string;
  occurrences: number;
}

async function listHints(
  request: APIRequestContext,
  origin: string,
): Promise<ExtractionHintRecord[]> {
  const response = await request.get(`${origin}/api/extraction-hints`);
  expect(response.status()).toBe(200);
  return response.json() as Promise<ExtractionHintRecord[]>;
}

test.describe('learned extraction hints', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('shows a seeded hint, deletes it through the UI, and persists its removal', async ({
    page,
    request,
    app,
  }) => {
    const hints = await listHints(request, app.origin);
    const hint = hints.find((entry) => entry.id === app.ids.extractionHintId);
    if (!hint) throw new Error(`Seeded extraction hint ${app.ids.extractionHintId} was missing.`);
    expect(hint).toMatchObject({
      issuerName: expect.stringMatching(/^E2E Extraction Issuer /),
      field: 'invoiceNumber',
      anchorKind: 'inline',
      anchorLabel: 'Invoice number',
      sampleValue: expect.stringMatching(/^E2E-INV-/),
      occurrences: 2,
    });

    await page.goto(`${app.origin}/extraction-hints`);
    await expect(page.getByRole('heading', { name: 'Learned extraction hints' })).toBeVisible();
    await expect(page.getByText(hint.issuerName, { exact: true })).toBeVisible();
    const hintRow = page.getByRole('row').filter({ hasText: hint.sampleValue });
    await expect(hintRow).toContainText(hint.anchorLabel);

    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${app.origin}/api/extraction-hints/${hint.id}` &&
        response.request().method() === 'DELETE',
    );
    await hintRow.getByRole('button').click();
    await expect(page.getByText('Delete hint', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBe(204);
    await expect(page.getByText('Hint deleted', { exact: true })).toBeVisible();

    await page.reload();
    expect((await listHints(request, app.origin)).some((entry) => entry.id === hint.id)).toBe(
      false,
    );
  });
});

test.describe('extraction hint permission boundaries', () => {
  test.use({ actor: 'restricted', scenario: 'configured', locale: 'en' });

  test('denies the route and API to a member without document access', async ({
    page,
    request,
    app,
  }) => {
    const browserRequests: string[] = [];
    page.on('request', (browserRequest) => {
      const url = new URL(browserRequest.url());
      if (url.pathname === '/api/extraction-hints') browserRequests.push(browserRequest.url());
    });

    await page.goto(`${app.origin}/extraction-hints`);
    await expect(
      page.getByText('You do not have access to this section', { exact: true }),
    ).toBeVisible();
    expect(browserRequests).toEqual([]);

    const listResponse = await request.get(`${app.origin}/api/extraction-hints`);
    expect(listResponse.status()).toBe(403);
    expect(await listResponse.json()).toEqual({ statusCode: 403, message: 'Forbidden' });

    const deleteResponse = await request.delete(
      `${app.origin}/api/extraction-hints/${app.ids.extractionHintId}`,
    );
    expect(deleteResponse.status()).toBe(403);
    expect(await deleteResponse.json()).toEqual({ statusCode: 403, message: 'Forbidden' });
  });
});
