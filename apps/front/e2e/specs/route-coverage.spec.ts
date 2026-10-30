import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

interface RouteTestApp {
  origin: string;
  ids: {
    clientId: string;
    projectId: string;
    staffMemberId: string;
    supplierId: string;
    notificationId: string;
  };
  requestAs: (actor: 'admin' | 'readonly' | 'restricted') => Promise<APIRequestContext>;
  signIn: (page: Page, actor: 'admin' | 'anonymous') => Promise<void>;
}

interface ProjectDocumentRecord {
  id: string;
  name: string;
}

interface DashboardKpis {
  income: number;
  expenses: number;
  profit: number;
  margin: number;
}

const routeHeadings = {
  en: [
    ['/', 'Access'],
    ['/dashboard', 'Dashboard'],
    ['/companies', 'Companies'],
    ['/calendar', 'Calendar'],
    ['/documents', 'Documents'],
    ['/extraction-hints', 'Learned extraction hints'],
    ['/suppliers', 'Suppliers'],
    ['/equipment', 'Equipment'],
    ['/staff', 'Staff'],
    ['/planning', 'Planning'],
    ['/changelog', 'Changelog'],
  ],
  es: [
    ['/', 'Accede a'],
    ['/dashboard', 'Panel'],
    ['/companies', 'Empresas'],
    ['/calendar', 'Calendario'],
    ['/documents', 'Documentos'],
    ['/extraction-hints', 'Pistas de extracción aprendidas'],
    ['/suppliers', 'Proveedores'],
    ['/equipment', 'Equipos'],
    ['/staff', 'Personal'],
    ['/planning', 'Planificación'],
    ['/changelog', 'Registro de cambios'],
  ],
} as const;

const projectSections = {
  en: [
    ['documents', 'Documents'],
    ['checklist', 'Checklist'],
    ['equipment', 'Equipment'],
    ['dashboard', 'Dashboard'],
    ['schedule', 'Calendar'],
    ['settings', 'Settings'],
  ],
  es: [
    ['documents', 'Documentos'],
    ['checklist', 'Checklist'],
    ['equipment', 'Equipos'],
    ['dashboard', 'Panel'],
    ['schedule', 'Calendario'],
    ['settings', 'Configuración'],
  ],
} as const;

const staffSections = {
  en: [
    ['documents', 'Documents'],
    ['payrolls', 'Payrolls'],
    ['schedule', 'Schedule'],
  ],
  es: [
    ['documents', 'Documentos'],
    ['payrolls', 'Nóminas'],
    ['schedule', 'Agenda'],
  ],
} as const;

const staffProfileLabels = {
  en: 'Profile',
  es: 'Perfil',
} as const;

const workspaceTabs = {
  en: [
    ['company', 'Company'],
    ['members', 'Users and permissions'],
    ['integrations', 'Integrations'],
    ['tax-compliance', 'Tax compliance'],
  ],
  es: [
    ['company', 'Empresa'],
    ['members', 'Usuarios y permisos'],
    ['integrations', 'Integraciones'],
    ['tax-compliance', 'Cumplimiento fiscal'],
  ],
} as const;

async function readJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  return response.json() as Promise<T>;
}

async function readSeededDocument(
  request: APIRequestContext,
  app: RouteTestApp,
): Promise<ProjectDocumentRecord> {
  const documents = await readJson<ProjectDocumentRecord[]>(
    request,
    `${app.origin}/api/projects/${app.ids.projectId}/documents`,
  );
  const document = documents.find((entry) => entry.name.startsWith('E2E Staff Archive Reference '));
  if (!document)
    throw new Error('The seeded staff archive reference was missing from the API list');
  return document;
}

async function assertRouteHeadings(
  page: Page,
  request: APIRequestContext,
  app: RouteTestApp,
  locale: 'en' | 'es',
) {
  const company = await readJson<{ name: string }>(request, `${app.origin}/api/company`);
  for (const [path, heading] of routeHeadings[locale]) {
    if (path === '/') await app.signIn(page, 'anonymous');
    const route =
      path === '/documents' ? `${path}?supplierId=${encodeURIComponent(app.ids.supplierId)}` : path;
    await page.goto(`${app.origin}${route}`);
    if (path === '/dashboard') {
      const dashboardHeading = page.getByRole('heading').filter({ hasText: company.name });
      await expect(dashboardHeading).toBeVisible();
      await expect(dashboardHeading).toContainText(
        locale === 'en'
          ? /^(Good morning|Good afternoon|Good evening),/
          : /^(Buenos días|Buenas tardes|Buenas noches),/,
      );
    } else if (path === '/calendar') {
      await expect(page.getByRole('main').getByText(heading, { exact: true })).toBeVisible();
    } else {
      const expectedHeading = path === '/' ? `${heading} ${company.name}` : heading;
      await expect(page.getByRole('heading', { name: expectedHeading, exact: true })).toBeVisible();
    }
    if (path === '/') await app.signIn(page, 'admin');
  }
}

test.describe('English application route coverage', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('loads the primary route tree, project and staff sections, and workspace tabs', async ({
    page,
    request,
    app,
  }) => {
    await assertRouteHeadings(page, request, app, 'en');

    const client = await readJson<{ name: string }>(
      request,
      `${app.origin}/api/clients/${app.ids.clientId}`,
    );
    const project = await readJson<{ name: string }>(
      request,
      `${app.origin}/api/projects/${app.ids.projectId}`,
    );
    await page.goto(`${app.origin}/companies/${app.ids.clientId}/projects`);
    await expect(
      page.getByRole('heading', { name: `Projects · ${client.name}`, exact: true }),
    ).toBeVisible();

    for (const [section, label] of projectSections.en) {
      await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=${section}`);
      await expect(page.getByRole('heading', { name: project.name, exact: true })).toBeVisible();
      await expect(page.getByRole('radio', { name: label, exact: true })).toBeChecked();
    }

    for (const [section, label] of staffSections.en) {
      await page.goto(`${app.origin}/staff/${app.ids.staffMemberId}?section=${section}`);
      const sectionTab = page.locator('.ant-segmented-item').filter({ hasText: label });
      await expect(sectionTab).toBeVisible();
      await expect(sectionTab).toHaveClass(/ant-segmented-item-selected/);
      await expect(page).toHaveURL(
        new RegExp(`/staff/${app.ids.staffMemberId}\\?section=${section}$`),
      );
    }
    await expect(
      page.getByRole('complementary').last().getByText(staffProfileLabels.en, { exact: true }),
    ).toBeVisible();

    for (const [tab, label] of workspaceTabs.en) {
      await page.goto(`${app.origin}/workspace?tab=${tab}`);
      await expect(page.getByRole('tab', { name: label, exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    }

    await page.goto(`${app.origin}/projects`);
    await expect(page).toHaveURL(/\/companies$/);
  });
});

test.describe('Spanish application route coverage', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'es' });

  test('loads the translated route tree, project and staff sections, and workspace tabs', async ({
    page,
    request,
    app,
  }) => {
    await assertRouteHeadings(page, request, app, 'es');

    const client = await readJson<{ name: string }>(
      request,
      `${app.origin}/api/clients/${app.ids.clientId}`,
    );
    await page.goto(`${app.origin}/companies/${app.ids.clientId}/projects`);
    await expect(
      page.getByRole('heading', { name: `Proyectos · ${client.name}`, exact: true }),
    ).toBeVisible();

    const project = await readJson<{ name: string }>(
      request,
      `${app.origin}/api/projects/${app.ids.projectId}`,
    );
    for (const [section, label] of projectSections.es) {
      await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=${section}`);
      await expect(page.getByRole('heading', { name: project.name, exact: true })).toBeVisible();
      await expect(page.getByRole('radio', { name: label, exact: true })).toBeChecked();
    }

    for (const [section, label] of staffSections.es) {
      await page.goto(`${app.origin}/staff/${app.ids.staffMemberId}?section=${section}`);
      const sectionTab = page.locator('.ant-segmented-item').filter({ hasText: label });
      await expect(sectionTab).toBeVisible();
      await expect(sectionTab).toHaveClass(/ant-segmented-item-selected/);
      await expect(page).toHaveURL(
        new RegExp(`/staff/${app.ids.staffMemberId}\\?section=${section}$`),
      );
    }
    await expect(
      page.getByRole('complementary').last().getByText(staffProfileLabels.es, { exact: true }),
    ).toBeVisible();

    for (const [tab, label] of workspaceTabs.es) {
      await page.goto(`${app.origin}/workspace?tab=${tab}`);
      await expect(page.getByRole('tab', { name: label, exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    }

    await page.goto(`${app.origin}/projects`);
    await expect(page).toHaveURL(/\/companies$/);
    await expect(page.getByRole('heading', { name: 'Empresas', exact: true })).toBeVisible();
  });
});

test.describe('shared application shell', () => {
  test.use({ actor: 'admin', scenario: 'configured', locale: 'en' });

  test('renders dashboard KPIs from the dashboard API response', async ({ page, app }) => {
    const isDashboardResponse = (response: import('@playwright/test').Response) => {
      const url = new URL(response.url());
      return response.request().method() === 'GET' && url.pathname === '/api/dashboard';
    };
    const dashboardResponse = page.waitForResponse(isDashboardResponse);
    await page.goto(`${app.origin}/dashboard`);
    const response = await dashboardResponse;
    expect(response.status()).toBe(200);
    const dashboard = (await response.json()) as DashboardKpis;

    const expectedValues = [
      {
        label: 'Total income',
        value: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(dashboard.income),
      },
      {
        label: 'Total expenses',
        value: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(dashboard.expenses),
      },
      {
        label: 'Net profit',
        value: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(dashboard.profit),
      },
      { label: 'Margin', value: `${(dashboard.margin * 100).toFixed(0)}%` },
    ];

    for (const { label, value } of expectedValues) {
      const card = page
        .getByText(label, { exact: true })
        .first()
        .locator(
          'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-card ")][1]',
        );
      await expect(card).toContainText(value);
    }
  });

  test('persists theme, searches a seeded project, and marks and resolves a notification', async ({
    page,
    request,
    app,
  }) => {
    await page.goto(`${app.origin}/dashboard`);
    await page.evaluate(() => window.localStorage.setItem('ledgerly:theme', 'light'));
    await page.reload();
    await page.getByRole('button', { name: 'Toggle between light and dark mode' }).click();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('ledgerly:theme')))
      .toBe('dark');
    await page.reload();
    expect(await page.evaluate(() => window.localStorage.getItem('ledgerly:theme'))).toBe('dark');
    await expect(
      page.getByRole('button', { name: 'Toggle between light and dark mode' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: 'Toggle between light and dark mode' })
        .locator('.anticon-moon'),
    ).toBeVisible();

    const project = await readJson<{ name: string }>(
      request,
      `${app.origin}/api/projects/${app.ids.projectId}`,
    );
    const document = await readSeededDocument(request, app);
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog');
    const search = palette.getByPlaceholder('Search projects, suppliers, documents...');
    await search.fill(project.name);
    const result = palette.getByRole('listitem').filter({ hasText: project.name });
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${app.ids.projectId}(?:\\?|$)`));

    await page.keyboard.press('Control+k');
    const documentSearch = page
      .getByRole('dialog')
      .getByPlaceholder('Search projects, suppliers, documents...');
    const documentSearchResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'GET' &&
        url.pathname === '/api/documents' &&
        url.searchParams.get('search') === document.name
      );
    });
    await documentSearch.fill(document.name);
    expect((await documentSearchResponse).status()).toBe(200);
    const documentResult = page
      .getByRole('dialog')
      .getByRole('listitem')
      .filter({ hasText: document.name });
    await expect(documentResult).toBeVisible();
    await documentResult.click();
    await expect(page).toHaveURL(/\/documents(?:\?.*)?$/);

    const notificationResponse = await request.get(
      `${app.origin}/api/notifications?page=1&size=50&status=all`,
    );
    expect(notificationResponse.status()).toBe(200);
    const notifications = (await notificationResponse.json()) as {
      items: { id: string; readAt: string | null; resolvedAt: string | null }[];
    };
    const notification = notifications.items.find((item) => item.id === app.ids.notificationId);
    if (!notification)
      throw new Error(
        `Seeded notification ${app.ids.notificationId} was missing from the API list`,
      );
    expect(notification.readAt).toBeNull();
    expect(notification.resolvedAt).toBeNull();

    await page.getByRole('button', { name: /Open notifications/ }).click();
    const titleId = `notification-title-${notification.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const notificationRow = page.locator(`li[aria-labelledby="${titleId}"]`);
    await expect(notificationRow).toBeVisible();
    const readResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/notifications/${notification.id}/read`,
    );
    await notificationRow.getByRole('button', { name: 'Mark notification as read' }).click();
    expect((await readResponsePromise).status()).toBe(204);

    const updatedReadList = await readJson<{ items: { id: string; readAt: string | null }[] }>(
      request,
      `${app.origin}/api/notifications?page=1&size=50&status=all`,
    );
    expect(
      updatedReadList.items.find((item) => item.id === notification.id)?.readAt,
    ).not.toBeNull();

    const resolveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/notifications/${notification.id}/resolve`,
    );
    await notificationRow.getByRole('button', { name: 'Resolve notification' }).click();
    expect((await resolveResponsePromise).status()).toBe(204);
    await expect(notificationRow).toHaveCount(0);

    const updatedResolvedList = await readJson<{
      items: { id: string; resolvedAt: string | null }[];
    }>(request, `${app.origin}/api/notifications?page=1&size=50&status=all`);
    expect(
      updatedResolvedList.items.find((item) => item.id === notification.id)?.resolvedAt,
    ).not.toBeNull();
  });
});

test.describe('restricted access routes', () => {
  test.use({ actor: 'restricted', scenario: 'configured', locale: 'en' });

  test('falls back to the available project section and denies documents through UI and API', async ({
    page,
    app,
  }) => {
    const restrictedRequest = await app.requestAs('restricted');
    const adminRequest = await app.requestAs('admin');
    const project = await readJson<{ name: string }>(
      restrictedRequest,
      `${app.origin}/api/projects/${app.ids.projectId}`,
    );
    const document = await readSeededDocument(adminRequest, app);

    await page.goto(`${app.origin}/dashboard`);
    await expect(
      page.getByText('You do not have access to this section', { exact: true }),
    ).toBeVisible();
    const dashboardResponse = await restrictedRequest.get(`${app.origin}/api/dashboard`);
    expect(dashboardResponse.status()).toBe(403);
    expect(await dashboardResponse.json()).toEqual({ statusCode: 403, message: 'Forbidden' });

    await page.goto(`${app.origin}/projects/${app.ids.projectId}?section=documents`);
    await expect(page).toHaveURL(new RegExp(`/projects/${app.ids.projectId}\\?section=settings$`));
    await expect(page.getByRole('radio', { name: 'Settings', exact: true })).toBeChecked();

    const documentSearchRequests: string[] = [];
    page.on('request', (browserRequest) => {
      const url = new URL(browserRequest.url());
      if (browserRequest.method() === 'GET' && url.pathname === '/api/documents') {
        documentSearchRequests.push(browserRequest.url());
      }
    });
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog');
    const search = palette.getByPlaceholder('Search projects, suppliers, documents...');
    await search.fill(project.name);
    const projectResult = palette.getByRole('listitem').filter({ hasText: project.name });
    await expect(projectResult).toBeVisible();
    await projectResult.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${app.ids.projectId}\\?section=settings$`));

    await page.keyboard.press('Control+k');
    const documentSearch = page
      .getByRole('dialog')
      .getByPlaceholder('Search projects, suppliers, documents...');
    await documentSearch.fill(document.name);
    await expect(page.getByText('No results found', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('listitem').filter({ hasText: document.name }),
    ).toHaveCount(0);
    expect(documentSearchRequests).toEqual([]);

    await page.goto(`${app.origin}/documents`);
    await expect(
      page.getByText('You do not have access to this section', { exact: true }),
    ).toBeVisible();

    const projectDocumentsResponse = await restrictedRequest.get(
      `${app.origin}/api/projects/${app.ids.projectId}/documents`,
    );
    expect(projectDocumentsResponse.status()).toBe(403);
    expect(await projectDocumentsResponse.json()).toEqual({
      statusCode: 403,
      message: 'Forbidden',
    });

    const documentSearchResponse = await restrictedRequest.get(
      `${app.origin}/api/documents?search=${encodeURIComponent(document.name)}`,
    );
    expect(documentSearchResponse.status()).toBe(403);
    expect(await documentSearchResponse.json()).toEqual({
      statusCode: 403,
      message: 'Forbidden',
    });
  });
});

test.describe('staff profile-only access', () => {
  test.use({ actor: 'staffProfileOnly', scenario: 'configured', locale: 'en' });

  test('exposes the profile route when staff view is the only available section', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.origin}/staff/${app.ids.staffMemberId}?section=profile`);
    const profileTab = page.locator('.ant-segmented-item').filter({ hasText: 'Profile' });
    await expect(profileTab).toBeVisible();
    await expect(profileTab).toHaveClass(/ant-segmented-item-selected/);
    await expect(page).toHaveURL(new RegExp(`/staff/${app.ids.staffMemberId}\\?section=profile$`));
  });
});

test.describe('Spanish staff profile-only access', () => {
  test.use({ actor: 'staffProfileOnly', scenario: 'configured', locale: 'es' });

  test('exposes the localized profile route when staff view is the only available section', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.origin}/staff/${app.ids.staffMemberId}?section=profile`);
    const profileTab = page.locator('.ant-segmented-item').filter({ hasText: 'Perfil' });
    await expect(profileTab).toBeVisible();
    await expect(profileTab).toHaveClass(/ant-segmented-item-selected/);
    await expect(page).toHaveURL(new RegExp(`/staff/${app.ids.staffMemberId}\\?section=profile$`));
  });
});

test.describe('read-only mutation access', () => {
  test.use({ actor: 'readonly', scenario: 'configured', locale: 'en' });

  test('allows a dashboard-view member to open the dashboard and read its API', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.origin}/dashboard`);
    await expect(page.getByText('Total income', { exact: true })).toBeVisible();

    const readonlyRequest = await app.requestAs('readonly');
    const response = await readonlyRequest.get(`${app.origin}/api/dashboard`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        income: expect.any(Number),
        expenses: expect.any(Number),
        profit: expect.any(Number),
        margin: expect.any(Number),
      }),
    );
  });

  test('keeps client creation unavailable and denies the API mutation', async ({ page, app }) => {
    await page.goto(`${app.origin}/companies`);
    await expect(page.getByRole('button', { name: 'Add company' })).toHaveCount(0);

    const readonlyRequest = await app.requestAs('readonly');
    const response = await readonlyRequest.post(`${app.origin}/api/clients`, {
      data: { name: `E2E forbidden client ${Date.now()}` },
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({
      statusCode: 403,
      message: 'Forbidden',
    });
  });
});
