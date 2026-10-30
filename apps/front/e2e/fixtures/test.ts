import { randomBytes } from 'node:crypto';
import { expect, test as base } from '@playwright/test';
import type { APIRequest, APIRequestContext, BrowserContext, Cookie, Page } from '@playwright/test';

export type Actor = 'admin' | 'readonly' | 'restricted' | 'staffProfileOnly' | 'anonymous';
export type AuthenticatedActor = Exclude<Actor, 'anonymous'>;
export type Scenario = 'fresh' | 'onboarding' | 'configured';

interface FixtureOptions {
  actor: Actor;
  scenario: Scenario;
  acknowledgeRelease: boolean;
}

interface TestIds {
  clientId: string;
  projectId: string;
  staffMemberId: string;
  supplierId: string;
  equipmentId: string;
  templateId: string;
  notificationId: string;
  extractionHintId: string;
}

interface SessionCookie {
  name: string;
  value: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: Cookie['sameSite'];
}

interface ResetResult {
  bootstrapEmail: string;
  ids: Partial<TestIds>;
  currentReleaseVersion: string;
  infectedMarker: string;
  actors: Partial<Record<AuthenticatedActor, SessionCookie>>;
  origin: string;
}

export interface TestApp {
  origin: string;
  testClientAddress: string;
  bootstrapEmail: string;
  ids: TestIds;
  currentReleaseVersion: string;
  infectedMarker: string;
  signIn: (page: Page, actor: Actor) => Promise<void>;
  requestAs: (actor: AuthenticatedActor) => Promise<APIRequestContext>;
}

interface TestFixtures {
  app: TestApp;
}

interface WorkerFixtures {
  controlClient: APIRequestContext;
  controlSettings: { url: string; token: string };
}

const actorOptions: Actor[] = ['admin', 'readonly', 'restricted', 'staffProfileOnly', 'anonymous'];
const scenarioOptions: Scenario[] = ['fresh', 'onboarding', 'configured'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function controlSettingsFromEnvironment(): { url: string; token: string } {
  const controlUrl = process.env.LEDGERLY_E2E_CONTROL_URL;
  const token = process.env.LEDGERLY_E2E_CONTROL_TOKEN;
  if (!controlUrl || !token) {
    throw new Error('The local Playwright stack runner did not provide its fixture bridge.');
  }

  const parsedUrl = new URL(controlUrl);
  if (
    parsedUrl.protocol !== 'http:' ||
    parsedUrl.hostname !== '127.0.0.1' ||
    parsedUrl.username !== '' ||
    parsedUrl.password !== '' ||
    parsedUrl.pathname !== '/' ||
    parsedUrl.search !== '' ||
    parsedUrl.hash !== '' ||
    !/^[A-Za-z0-9_-]{40,}$/.test(token)
  ) {
    throw new Error('The local Playwright fixture bridge settings are invalid.');
  }
  return { url: parsedUrl.origin, token };
}

function sessionCookie(result: ResetResult, actor: AuthenticatedActor): SessionCookie {
  const cookie = result.actors[actor];
  if (!cookie) throw new Error(`The ${actor} Playwright session is unavailable for this scenario.`);
  return cookie;
}

function storageCookie(cookie: SessionCookie, origin: string): Cookie {
  return {
    ...cookie,
    domain: new URL(origin).hostname,
    expires: -1,
  };
}

async function createRequestContext(
  playwrightRequest: APIRequest,
  result: ResetResult,
  testClientAddress: string,
  actor?: AuthenticatedActor,
): Promise<APIRequestContext> {
  const storageState = actor
    ? { cookies: [storageCookie(sessionCookie(result, actor), result.origin)], origins: [] }
    : { cookies: [], origins: [] };
  return playwrightRequest.newContext({
    baseURL: result.origin,
    extraHTTPHeaders: {
      origin: result.origin,
      'x-ledgerly-e2e-client': testClientAddress,
    },
    ignoreHTTPSErrors: false,
    storageState,
  });
}

const allocatedTestClientAddresses = new Set<string>();

function createTestClientAddress(): string {
  let address: string;
  do {
    const octets = randomBytes(2);
    address = `198.18.${octets.readUInt8(0)}.${octets.readUInt8(1)}`;
  } while (allocatedTestClientAddresses.has(address));
  allocatedTestClientAddresses.add(address);
  return address;
}

async function resetFixture(
  client: APIRequestContext,
  settings: { url: string; token: string },
  scenario: Scenario,
  acknowledgeRelease: boolean,
  testClientAddress: string,
): Promise<ResetResult> {
  const response = await client.post(`${settings.url}/reset`, {
    headers: {
      authorization: `Bearer ${settings.token}`,
      'content-type': 'application/json',
    },
    data: { scenario, acknowledgeRelease, testClientAddress },
    timeout: 120_000,
  });
  if (!response.ok()) {
    throw new Error(
      `The isolated application fixture reset failed with HTTP ${response.status()}.`,
    );
  }
  const result: unknown = await response.json();
  if (
    !isRecord(result) ||
    typeof result.origin !== 'string' ||
    typeof result.bootstrapEmail !== 'string' ||
    !isRecord(result.ids) ||
    typeof result.currentReleaseVersion !== 'string' ||
    typeof result.infectedMarker !== 'string' ||
    !isRecord(result.actors)
  ) {
    throw new Error('The isolated application fixture returned an invalid response.');
  }
  const origin = new URL(result.origin);
  if (
    origin.protocol !== 'https:' ||
    origin.hostname !== 'localhost' ||
    origin.username !== '' ||
    origin.password !== '' ||
    origin.pathname !== '/' ||
    origin.search !== '' ||
    origin.hash !== ''
  ) {
    throw new Error('The isolated application fixture returned an invalid HTTPS origin.');
  }
  return result as unknown as ResetResult;
}

const resetResults = new WeakMap<TestApp, ResetResult>();

export const test = base.extend<TestFixtures & FixtureOptions, WorkerFixtures>({
  actor: ['admin', { option: true }],
  scenario: ['configured', { option: true }],
  acknowledgeRelease: [true, { option: true }],
  controlSettings: [
    async ({ playwright }, provide) => {
      void playwright;
      await provide(controlSettingsFromEnvironment());
    },
    { scope: 'worker' },
  ],
  controlClient: [
    async ({ playwright }, provide) => {
      const client = await playwright.request.newContext({
        extraHTTPHeaders: { 'content-type': 'application/json' },
        ignoreHTTPSErrors: false,
      });
      try {
        await provide(client);
      } finally {
        await client.dispose();
      }
    },
    { scope: 'worker' },
  ],
  app: async (
    { actor, acknowledgeRelease, controlClient, controlSettings, playwright, scenario },
    provide,
  ) => {
    if (!actorOptions.includes(actor) || !scenarioOptions.includes(scenario)) {
      throw new Error('The Playwright scenario or actor is unsupported.');
    }
    const testClientAddress = createTestClientAddress();
    const result = await resetFixture(
      controlClient,
      controlSettings,
      scenario,
      acknowledgeRelease,
      testClientAddress,
    );
    const requests = new Set<APIRequestContext>();
    const app: TestApp = {
      origin: result.origin,
      testClientAddress,
      bootstrapEmail: result.bootstrapEmail,
      get ids() {
        if (scenario !== 'configured') {
          throw new Error(`Configured record IDs are unavailable in the ${scenario} scenario.`);
        }
        return result.ids as TestIds;
      },
      currentReleaseVersion: result.currentReleaseVersion,
      infectedMarker: result.infectedMarker,
      async signIn(page, nextActor) {
        if (!actorOptions.includes(nextActor))
          throw new Error('The Playwright actor is unsupported.');
        await page.context().clearCookies();
        if (nextActor !== 'anonymous') {
          await page
            .context()
            .addCookies([storageCookie(sessionCookie(result, nextActor), result.origin)]);
        }
        if (page.url() !== 'about:blank') await page.reload();
      },
      async requestAs(nextActor) {
        const request = await createRequestContext(
          playwright.request,
          result,
          testClientAddress,
          nextActor,
        );
        requests.add(request);
        return request;
      },
    };
    resetResults.set(app, result);

    try {
      await provide(app);
    } finally {
      resetResults.delete(app);
      await Promise.all([...requests].map((request) => request.dispose()));
    }
  },
  context: async ({ actor, app, browser, locale }, provide) => {
    const context: BrowserContext = await browser.newContext({
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { 'x-ledgerly-e2e-client': app.testClientAddress },
    });
    try {
      const language = locale?.startsWith('es') ? 'es' : 'en';
      await context.route('**/*', (route) => {
        let requestOrigin: string;
        try {
          requestOrigin = new URL(route.request().url()).origin;
        } catch {
          return route.abort();
        }
        return requestOrigin === app.origin ? route.continue() : route.abort();
      });
      await context.addInitScript((language) => {
        if (window.localStorage.getItem('i18nextLng') === null) {
          window.localStorage.setItem('i18nextLng', language);
        }
      }, language);
      if (actor !== 'anonymous') {
        const result = await resetResultForApp(app);
        await context.addCookies([storageCookie(sessionCookie(result, actor), app.origin)]);
      }
      await provide(context);
    } finally {
      await context.close();
    }
  },
  page: async ({ context, app }, provide) => {
    const page = await context.newPage();
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(`Unhandled page error: ${error.message}`));
    page.on('requestfailed', (request) => {
      const url = new URL(request.url());
      if (
        url.origin === app.origin &&
        url.pathname.startsWith('/api/') &&
        request.failure()?.errorText !== 'net::ERR_ABORTED'
      ) {
        failures.push(`Same-origin request failed: ${request.method()} ${request.url()}`);
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 500 && new URL(response.url()).origin === app.origin) {
        failures.push(`Same-origin HTTP ${response.status()}: ${response.url()}`);
      }
    });
    await provide(page);
    if (failures.length) throw new Error(failures.join('\n'));
  },
  request: async ({ actor, app, playwright }, provide) => {
    const request = await createRequestContext(
      playwright.request,
      await resetResultForApp(app),
      app.testClientAddress,
      actor === 'anonymous' ? undefined : actor,
    );
    try {
      await provide(request);
    } finally {
      await request.dispose();
    }
  },
});

async function resetResultForApp(app: TestApp): Promise<ResetResult> {
  const result = resetResults.get(app);
  if (!result) throw new Error('The Playwright fixture state is unavailable.');
  return result;
}

export { expect };
