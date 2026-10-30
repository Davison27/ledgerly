import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

async function openEnglishPage(page: Page, url: string) {
  await page.goto(url);
}

async function openSpanishPage(page: Page, url: string) {
  await page.goto(url);
}

async function interceptGoogleRedirect(page: Page, origin: string) {
  let authorizationUrl: string | undefined;
  await page.route(`${origin}/api/auth/sign-in/social`, async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as { url?: string };
    authorizationUrl = body.url;
    await route.fulfill({ response, json: { ...body, url: `${origin}/` } });
  });
  return () => authorizationUrl;
}

async function readJson(page: Page, path: string): Promise<{ status: number; body: unknown }> {
  return page.evaluate(async (requestPath) => {
    const response = await fetch(requestPath, { credentials: 'include' });
    return { status: response.status, body: await response.json() };
  }, path);
}

test.describe('first administrator bootstrap', () => {
  test.use({ actor: 'anonymous', scenario: 'fresh' });

  test('creates the first administrator, rejects a duplicate bootstrap, and starts local Google sign-in', async ({
    page,
    request,
    app,
  }) => {
    const getAuthorizationUrl = await interceptGoogleRedirect(page, app.origin);
    await openEnglishPage(page, `${app.origin}/`);

    await expect(page.getByText('Set up the first administrator', { exact: true })).toBeVisible();
    await page.getByLabel('Google email').fill(app.bootstrapEmail);

    const bootstrapResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/auth/bootstrap',
    );
    const socialResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/auth/sign-in/social',
    );

    await page.getByRole('button', { name: 'Continue with Google' }).click();

    const bootstrapResponse = await bootstrapResponsePromise;
    expect(bootstrapResponse.status()).toBe(201);
    expect(await bootstrapResponse.json()).toEqual({ email: app.bootstrapEmail });

    const socialResponse = await socialResponsePromise;
    expect(socialResponse.ok()).toBeTruthy();
    expect(getAuthorizationUrl()).toMatch(/^https:\/\/accounts\.google\.com\//);

    const duplicateResponse = await request.post(`${app.origin}/api/auth/bootstrap`, {
      headers: { origin: app.origin },
      data: { email: app.bootstrapEmail },
    });
    expect(duplicateResponse.status()).toBe(403);
    expect(await duplicateResponse.json()).toMatchObject({ code: 'BOOTSTRAP_UNAVAILABLE' });

    const status = await request.get(`${app.origin}/api/auth/status`);
    expect(status.ok()).toBeTruthy();
    expect(await status.json()).toEqual({ bootstrapNeeded: false, authenticated: false });
  });
});

test.describe('company onboarding', () => {
  test.use({ actor: 'admin', scenario: 'onboarding' });

  test('saves the three onboarding steps and redirects configured workspaces to the dashboard', async ({
    page,
    app,
  }) => {
    await openEnglishPage(page, `${app.origin}/onboarding`);

    await expect(page.getByRole('heading', { name: 'Set up your company' })).toBeVisible();
    await page.getByLabel('Commercial name', { exact: true }).fill('Synthetic Workshop');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByLabel('Email', { exact: true }).fill('office@synthetic-workshop.example');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByLabel('Address', { exact: true }).fill('42 Test Avenue');
    await page.getByLabel('City', { exact: true }).fill('Example City');
    await page.getByLabel('Postal code', { exact: true }).fill('12345');
    await page.getByLabel('Country', { exact: true }).fill('Spain');
    await page.getByRole('button', { name: 'Finish' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    const companyResponse = await readJson(page, '/api/company');
    expect(companyResponse.status).toBe(200);
    expect(companyResponse.body).toMatchObject({
      name: 'Synthetic Workshop',
      email: 'office@synthetic-workshop.example',
      address: '42 Test Avenue',
      city: 'Example City',
      postalCode: '12345',
      country: 'Spain',
    });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`${app.origin}/onboarding`);
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('Spanish company onboarding route', () => {
  test.use({ actor: 'admin', scenario: 'onboarding', locale: 'es' });

  test('renders the onboarding landmark in Spanish', async ({ page, app }) => {
    await openSpanishPage(page, `${app.origin}/onboarding`);
    await expect(page.getByRole('heading', { name: 'Configura tu empresa' })).toBeVisible();
  });
});

test.describe('onboarding access boundaries', () => {
  test.use({ actor: 'restricted', scenario: 'configured', locale: 'en' });

  test('denies restricted members from company setup through the route and API', async ({
    page,
    request,
    app,
  }) => {
    await page.goto(`${app.origin}/onboarding`);
    await expect(
      page.getByText('You do not have access to this section', { exact: true }),
    ).toBeVisible();

    const response = await request.patch(`${app.origin}/api/company`, {
      data: { name: 'E2E Forbidden Company Update' },
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden' });
  });
});

test.describe('session lifecycle', () => {
  test.use({ actor: 'admin', scenario: 'configured' });

  test('requires a recognized session and returns to login when the session cookie is removed', async ({
    page,
    app,
  }) => {
    await openEnglishPage(page, `${app.origin}/dashboard`);
    const status = await readJson(page, '/api/auth/status');
    expect(status.status).toBe(200);
    expect(status.body).toEqual({ bootstrapNeeded: false, authenticated: true });

    const member = await readJson(page, '/api/auth/me');
    expect(member.status).toBe(200);
    expect(member.body).toMatchObject({ role: 'admin', status: 'active' });

    await page.context().clearCookies();
    await page.reload();
    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await expect(page.getByRole('alert')).toContainText('Your session has expired');

    const expiredStatus = await readJson(page, '/api/auth/status');
    expect(expiredStatus.body).toEqual({ bootstrapNeeded: false, authenticated: false });
    const expiredMember = await readJson(page, '/api/auth/me');
    expect(expiredMember.status).toBe(401);
  });
});

test.describe('login callback states', () => {
  test.use({ actor: 'anonymous', scenario: 'configured' });

  test('renders login notices and rejects an invalid local Google callback', async ({
    page,
    request,
    app,
  }) => {
    await openEnglishPage(page, `${app.origin}/?authError=access_denied`);
    await expect(page.getByRole('alert')).toContainText(
      "We couldn't sign you in with that account",
    );

    await page.goto(`${app.origin}/?sessionExpired=true`);
    await expect(page.getByRole('alert')).toContainText('Your session has expired');

    await page.goto(`${app.origin}/?signedOut=true`);
    await expect(page.getByRole('alert')).toContainText("You've been signed out");

    const callbackResponse = await request.get(
      `${app.origin}/api/auth/callback/google?code=invalid&state=invalid`,
      { maxRedirects: 0 },
    );
    expect(callbackResponse.status()).toBe(302);
    const callbackLocation = new URL(callbackResponse.headers().location, app.origin);
    expect(callbackLocation.origin).toBe(app.origin);
    expect(callbackLocation.searchParams.get('error')).toBe('state_mismatch');
  });

  test('returns a Google authorization URL from the local Better Auth endpoint', async ({
    request,
    app,
  }) => {
    const socialResponse = await request.post(`${app.origin}/api/auth/sign-in/social`, {
      headers: { origin: app.origin },
      data: { provider: 'google', callbackURL: `${app.origin}/` },
    });
    expect(socialResponse.ok()).toBeTruthy();
    const socialBody = (await socialResponse.json()) as { url?: string };
    expect(socialBody.url).toMatch(/^https:\/\/accounts\.google\.com\//);
  });

  test('switches the login language and restores it after reload', async ({ page, app }) => {
    await openEnglishPage(page, `${app.origin}/`);
    await page
      .getByRole('radiogroup', { name: 'Language' })
      .getByText('ES', { exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('i18nextLng')))
      .toBe('es');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'ES', exact: true })).toBeChecked();
  });
});
