import { randomBytes, randomUUID, X509Certificate } from 'node:crypto';
import { createRequire } from 'node:module';
import https from 'node:https';

const RESULT_MARKER = 'LEDGERLY_PLAYWRIGHT_FIXTURE:';
const INFECTED_MARKER = 'LEDGERLY_E2E_INFECTED_MARKER';
const DATABASE_NAME_PATTERN = /^ledgerly_e2e_[a-f0-9]{12}$/;
const DATABASE_USER_PATTERN = /^e2e_[a-f0-9]{12}$/;
const BOOTSTRAP_EMAIL_PATTERN = /^e2e-admin-[a-f0-9]{12}@example\.com$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const API_METHODS = new Set(['GET', 'POST', 'PATCH']);
const MIGRATION_TABLE_PATTERN = /migration/i;
const REQUIRED_INPUT_KEYS = [
  'acknowledgeRelease',
  'currentReleaseVersion',
  'origin',
  'scenario',
  'testClientAddress',
];
const TEST_CLIENT_ADDRESS_PATTERN =
  /^198\.18\.(?:0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])\.(?:0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])$/;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(message) {
  throw new Error(message);
}

function decodeBase64UrlJson(value) {
  if (typeof value !== 'string' || value.length === 0 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    fail('The fixture input must be base64url JSON.');
  }

  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value || decoded.length > 4096) {
    fail('The fixture input encoding is invalid.');
  }

  let parsed;
  try {
    parsed = JSON.parse(decoded.toString('utf8'));
  } catch {
    fail('The fixture input must contain valid JSON.');
  }

  if (!isRecord(parsed) || Object.keys(parsed).sort().join(',') !== REQUIRED_INPUT_KEYS.join(',')) {
    fail('The fixture input keys are invalid.');
  }

  if (!['fresh', 'onboarding', 'configured'].includes(parsed.scenario)) {
    fail('The fixture scenario is unsupported.');
  }

  if (typeof parsed.acknowledgeRelease !== 'boolean') {
    fail('The release acknowledgement setting must be a boolean.');
  }

  if (
    typeof parsed.testClientAddress !== 'string' ||
    !TEST_CLIENT_ADDRESS_PATTERN.test(parsed.testClientAddress)
  ) {
    fail('The fixture client address must use the reserved test address range.');
  }

  if (
    typeof parsed.currentReleaseVersion !== 'string' ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(parsed.currentReleaseVersion)
  ) {
    fail('The current release version must be a stable semantic version.');
  }

  if (typeof parsed.origin !== 'string') {
    fail('The application origin is invalid.');
  }

  const originMatch = /^https:\/\/localhost:([1-9]\d{0,4})$/.exec(parsed.origin);
  if (!originMatch) {
    fail('The application origin must use the local HTTPS proxy.');
  }

  const port = Number(originMatch[1]);
  let origin;
  try {
    origin = new URL(parsed.origin);
  } catch {
    fail('The application origin is invalid.');
  }

  if (
    !Number.isInteger(port) ||
    port > 65535 ||
    origin.origin !== parsed.origin ||
    origin.pathname !== '/' ||
    origin.search !== '' ||
    origin.hash !== '' ||
    origin.username !== '' ||
    origin.password !== ''
  ) {
    fail('The application origin is invalid.');
  }

  return parsed;
}

function decodeCertificate(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 100_000 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    fail('The local HTTPS certificate encoding is invalid.');
  }

  const bytes = Buffer.from(value, 'base64');
  if (bytes.length === 0 || bytes.length > 65_536 || bytes.toString('base64') !== value) {
    fail('The local HTTPS certificate encoding is invalid.');
  }

  const pem = bytes.toString('utf8');
  if (!/^-----BEGIN CERTIFICATE-----\r?\n[\s\S]+\r?\n-----END CERTIFICATE-----\r?\n?$/.test(pem)) {
    fail('The local HTTPS certificate is not a valid PEM certificate.');
  }

  let certificate;
  try {
    certificate = new X509Certificate(pem);
  } catch {
    fail('The local HTTPS certificate is invalid.');
  }

  if (!certificate.ca || !certificate.verify(certificate.publicKey)) {
    fail('The local HTTPS certificate must be a self-signed CA.');
  }

  return pem;
}

function validateRuntimeEnvironment(input) {
  const env = process.env;
  const requiredEnvironment = [
    env.NODE_ENV === 'production',
    env.DB_HOST === 'postgres',
    env.DB_PORT === '5432',
    DATABASE_NAME_PATTERN.test(env.DB_NAME ?? ''),
    DATABASE_USER_PATTERN.test(env.DB_USER ?? ''),
    typeof env.DB_PASSWORD === 'string' && /^[A-Za-z0-9_-]{43}$/.test(env.DB_PASSWORD),
    typeof env.BETTER_AUTH_SECRET === 'string' &&
      /^[A-Za-z0-9_-]{64}$/.test(env.BETTER_AUTH_SECRET),
    env.COOKIE_SECURE === 'true',
    env.TRUST_PROXY === 'true',
    env.FRONTEND_URL === input.origin,
    env.BACKEND_PUBLIC_URL === input.origin,
    BOOTSTRAP_EMAIL_PATTERN.test(env.BOOTSTRAP_ADMIN_EMAIL ?? ''),
    env.CLAMAV_ENABLED === 'true',
    env.CLAMAV_HOST === 'clamav',
    env.CLAMAV_PORT === '3310',
  ];

  if (requiredEnvironment.some((valid) => !valid)) {
    fail('The fixture is not running in its generated production test environment.');
  }

  return {
    host: 'postgres',
    port: 5432,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    bootstrapEmail: env.BOOTSTRAP_ADMIN_EMAIL,
  };
}

function createDatabasePool(environment) {
  const runtimeRequire = createRequire('/app/dist/lib/auth.js');
  const { Pool } = runtimeRequire('pg');

  return new Pool({
    host: environment.host,
    port: environment.port,
    database: environment.database,
    user: environment.user,
    password: environment.password,
    application_name: 'ledgerly-playwright-fixture',
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 1000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    max: 1,
  });
}

function quoteIdentifier(identifier) {
  return '"' + identifier.replaceAll('"', '""') + '"';
}

async function resetDatabase(pool, expectedDatabase, expectedUser) {
  const client = await pool.connect();
  try {
    const identity = await client.query(
      'SELECT current_database() AS database_name, current_user AS role_name',
    );
    if (
      identity.rows[0]?.database_name !== expectedDatabase ||
      identity.rows[0]?.role_name !== expectedUser
    ) {
      fail('The fixture database identity does not match its generated credentials.');
    }

    const tables = await client.query(
      'SELECT table_name ' +
        'FROM information_schema.tables ' +
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' " +
        'ORDER BY table_name',
    );
    const mutableTables = tables.rows
      .map((row) => row.table_name)
      .filter(
        (tableName) => !MIGRATION_TABLE_PATTERN.test(tableName) && tableName !== 'typeorm_metadata',
      );

    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL statement_timeout = 30000');
      if (mutableTables.length > 0) {
        const tableNames = mutableTables
          .map((tableName) => 'public.' + quoteIdentifier(tableName))
          .join(', ');
        await client.query('TRUNCATE TABLE ' + tableNames + ' RESTART IDENTITY');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    client.release();
  }
}

function validateApiPath(path) {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/api/') ||
    path.startsWith('//') ||
    path.includes('://') ||
    /[\r\n]/.test(path)
  ) {
    fail('The fixture attempted an unsupported application API path.');
  }
}

function validateSessionCookie(cookie) {
  const expectedKeys = ['httpOnly', 'name', 'path', 'sameSite', 'secure', 'value'];
  if (
    !isRecord(cookie) ||
    Object.keys(cookie).sort().join(',') !== expectedKeys.join(',') ||
    typeof cookie.name !== 'string' ||
    !/^[A-Za-z0-9._-]+$/.test(cookie.name) ||
    typeof cookie.value !== 'string' ||
    cookie.value.length < 16 ||
    /[\r\n;]/.test(cookie.value) ||
    typeof cookie.path !== 'string' ||
    !cookie.path.startsWith('/') ||
    cookie.httpOnly !== true ||
    cookie.secure !== true ||
    cookie.sameSite !== 'Lax'
  ) {
    fail('The Better Auth production session cookie is invalid.');
  }
  return cookie;
}

function createApiClient(origin, caPem, testClientAddress) {
  const agent = new https.Agent({
    ca: caPem,
    keepAlive: false,
    maxSockets: 1,
  });

  async function request(method, path, options = {}) {
    validateApiPath(path);
    if (!API_METHODS.has(method)) fail('The fixture attempted an unsupported API method.');

    const { cookie, json, multipart } = options;
    if (json !== undefined && multipart !== undefined) {
      fail('The fixture request body is invalid.');
    }

    const body =
      json !== undefined
        ? Buffer.from(JSON.stringify(json), 'utf8')
        : multipart !== undefined
          ? multipart
          : undefined;
    const headers = {
      Accept: 'application/json',
      Host: 'localhost',
      Origin: origin,
      Connection: 'close',
      'X-Ledgerly-E2E-Client': testClientAddress,
    };

    if (body !== undefined) {
      headers['Content-Length'] = String(body.length);
      headers['Content-Type'] =
        multipart !== undefined
          ? 'multipart/form-data; boundary=LedgerlyFixtureBoundary'
          : 'application/json';
    }

    if (cookie !== undefined) {
      const validCookie = validateSessionCookie(cookie);
      headers.Cookie = validCookie.name + '=' + validCookie.value;
    }

    return new Promise((resolve, reject) => {
      const outgoing = https.request(
        {
          agent,
          ca: caPem,
          host: 'proxy',
          method,
          path,
          port: 443,
          rejectUnauthorized: true,
          servername: 'localhost',
          headers,
          timeout: 60_000,
        },
        (incoming) => {
          const chunks = [];
          let size = 0;
          incoming.on('data', (chunk) => {
            size += chunk.length;
            if (size > 4 * 1024 * 1024) {
              incoming.destroy(new Error('The application API response exceeded its limit.'));
              return;
            }
            chunks.push(chunk);
          });
          incoming.once('error', reject);
          incoming.once('end', () => {
            resolve({
              status: incoming.statusCode ?? 0,
              headers: incoming.headers,
              body: Buffer.concat(chunks, size),
            });
          });
        },
      );

      outgoing.once('timeout', () => outgoing.destroy(new Error('The application API timed out.')));
      outgoing.once('error', reject);
      outgoing.end(body);
    });
  }

  return {
    request,
    close() {
      agent.destroy();
    },
  };
}

function expectStatus(response, status, path) {
  if (response.status !== status) {
    fail('The application API returned HTTP ' + response.status + ' for ' + path + '.');
  }
}

function parseJson(response, path) {
  try {
    return JSON.parse(response.body.toString('utf8'));
  } catch {
    fail('The application API returned invalid JSON for ' + path + '.');
  }
}

async function requestJson(api, method, path, options, expectedStatus) {
  const response = await api.request(method, path, options);
  expectStatus(response, expectedStatus, path);
  if (expectedStatus === 204) return undefined;
  return parseJson(response, path);
}

function requireUuid(value, name) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    fail('The application API did not return a valid ' + name + ' identifier.');
  }
  return value;
}

function createMultipartForm(fields = {}, file) {
  const boundary = 'LedgerlyFixtureBoundary';
  const chunks = [];
  for (const [name, value] of Object.entries(fields)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(name) || typeof value !== 'string') {
      fail('The fixture multipart field is invalid.');
    }
    chunks.push(
      Buffer.from(
        '--' +
          boundary +
          '\r\n' +
          'Content-Disposition: form-data; name="' +
          name +
          '"\r\n\r\n' +
          value +
          '\r\n',
        'utf8',
      ),
    );
  }
  if (file !== undefined) {
    if (
      typeof file.filename !== 'string' ||
      !/^[A-Za-z0-9._-]{1,128}$/.test(file.filename) ||
      typeof file.contentType !== 'string' ||
      !/^[A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+$/.test(file.contentType) ||
      !Buffer.isBuffer(file.bytes)
    ) {
      fail('The fixture multipart file is invalid.');
    }
    chunks.push(
      Buffer.from(
        '--' +
          boundary +
          '\r\n' +
          'Content-Disposition: form-data; name="file"; filename="' +
          file.filename +
          '"\r\n' +
          'Content-Type: ' +
          file.contentType +
          '\r\n\r\n',
        'utf8',
      ),
    );
    chunks.push(file.bytes);
    chunks.push(Buffer.from('\r\n', 'utf8'));
  }
  chunks.push(Buffer.from('--' + boundary + '--\r\n', 'utf8'));
  return Buffer.concat(chunks);
}

function createPdf(text = '') {
  const escapePdfText = (value) =>
    value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const stream =
    text.length > 0 ? 'BT /F1 12 Tf 50 760 Td (' + escapePdfText(text) + ') Tj ET' : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += String(index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += 'xref\n0 ' + String(objects.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  }
  pdf +=
    'trailer\n<< /Size ' +
    String(objects.length + 1) +
    ' /Root 1 0 R >>\nstartxref\n' +
    String(xrefOffset) +
    '\n%%EOF\n';
  return Buffer.from(pdf, 'utf8');
}

function formatUtcDate(date) {
  return date.toISOString().slice(0, 10);
}

async function createAuthSession(email) {
  const authSessionModule = await import('./create-auth-session.mjs');
  const session = await authSessionModule.createAuthSession(email);
  if (session.email !== email) fail('The Better Auth fixture created a different user.');
  return validateSessionCookie(session.cookie);
}

async function verifyActiveSession(api, cookie, expectedRole, expectedEmail) {
  const sessionPath = '/api/auth/get-session';
  const session = await requestJson(api, 'GET', sessionPath, { cookie }, 200);
  if (
    !isRecord(session) ||
    !isRecord(session.session) ||
    !isRecord(session.user) ||
    typeof session.session.token !== 'string' ||
    session.session.userId !== session.user.id ||
    session.user.email !== expectedEmail
  ) {
    fail('The Better Auth get-session endpoint did not recognize the expected user.');
  }

  const memberPath = '/api/auth/me';
  const member = await requestJson(api, 'GET', memberPath, { cookie }, 200);
  if (
    member.role !== expectedRole ||
    member.status !== 'active' ||
    member.email !== expectedEmail
  ) {
    fail('The Better Auth fixture member does not have the expected active role.');
  }
}

async function createFounderSession(pool, api, bootstrapEmail) {
  const permissions = {
    dashboard: 'view',
    projects: 'edit',
    calendar: 'edit',
    documents: 'edit',
    suppliers: 'edit',
    equipment: 'edit',
    staff: 'edit',
    planning: 'edit',
  };
  const now = new Date();
  const seededFounder = await pool.query(
    'INSERT INTO public.workspace_members ' +
      '(id, email, google_subject, name, role, permissions, status, is_founder, invited_at, joined_at) ' +
      'VALUES ($1, $2, NULL, $3, $4, $5::jsonb, $6, $7, $8, $9) RETURNING email',
    [
      randomUUID(),
      bootstrapEmail,
      bootstrapEmail.split('@', 1)[0],
      'admin',
      JSON.stringify(permissions),
      'active',
      true,
      now,
      now,
    ],
  );
  if (seededFounder.rowCount !== 1 || seededFounder.rows[0]?.email !== bootstrapEmail) {
    fail('The fixture could not seed its synthetic founder.');
  }

  const cookie = await createAuthSession(bootstrapEmail);
  await verifyActiveSession(api, cookie, 'admin', bootstrapEmail);
  return cookie;
}

function permissionMatrixFor(actor) {
  const modules = [
    'dashboard',
    'projects',
    'calendar',
    'documents',
    'suppliers',
    'equipment',
    'staff',
    'planning',
  ];
  const permissions = Object.fromEntries(modules.map((module) => [module, 'none']));

  if (actor === 'readonly') {
    return Object.fromEntries(modules.map((module) => [module, 'view']));
  }

  if (actor === 'restricted') {
    permissions.projects = 'view';
    permissions.staff = 'view';
    return permissions;
  }

  if (actor === 'staffProfileOnly') {
    permissions.staff = 'view';
    return permissions;
  }

  fail('The fixture member actor is unsupported.');
}

async function inviteMember(api, adminCookie, actor, suffix) {
  const email = 'e2e-' + suffix + '-' + actor.toLowerCase() + '@example.com';
  const name = 'E2E ' + actor + ' ' + suffix;
  const path = '/api/workspace/members';
  await requestJson(
    api,
    'POST',
    path,
    {
      cookie: adminCookie,
      json: {
        name,
        email,
        role: 'member',
        permissions: permissionMatrixFor(actor),
      },
    },
    201,
  );

  const cookie = await createAuthSession(email);
  await verifyActiveSession(api, cookie, 'member', email);
  return cookie;
}

async function acknowledgeRelease(api, actors, version, shouldAcknowledge) {
  for (const cookie of Object.values(actors)) {
    const path = '/api/release-notes/' + encodeURIComponent(version) + '/acknowledgement';
    if (shouldAcknowledge) {
      await requestJson(api, 'POST', path, { cookie }, 204);
    }
    const result = await requestJson(api, 'GET', path, { cookie }, 200);
    if (
      result.acknowledged !== shouldAcknowledge ||
      (shouldAcknowledge && typeof result.acknowledgedAt !== 'string') ||
      (!shouldAcknowledge && result.acknowledgedAt !== null)
    ) {
      fail('The release acknowledgement state is incorrect for a seeded actor.');
    }
  }
}

async function createConfiguredData(api, pool, adminCookie, suffix) {
  await requestJson(
    api,
    'PATCH',
    '/api/company',
    {
      cookie: adminCookie,
      json: {
        name: 'E2E Workspace ' + suffix,
        address: '12 Fixture Lane',
        city: 'Example City',
        postalCode: '00000',
        country: 'Spain',
        brandColor: '#2357d8',
      },
    },
    200,
  );

  const client = await requestJson(
    api,
    'POST',
    '/api/clients',
    { cookie: adminCookie, json: { name: 'E2E Client ' + suffix } },
    201,
  );
  const clientId = requireUuid(client.id, 'client');

  const template = await requestJson(
    api,
    'POST',
    '/api/project-checklist-templates',
    {
      cookie: adminCookie,
      json: {
        name: 'E2E Planning Template ' + suffix,
        items: ['Synthetic planning milestone ' + suffix],
      },
    },
    201,
  );
  const templateId = requireUuid(template.id, 'planning template');

  const today = new Date();
  const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const project = await requestJson(
    api,
    'POST',
    '/api/projects',
    {
      cookie: adminCookie,
      json: {
        name: 'E2E Project ' + suffix,
        code: 'E2E-' + suffix.slice(0, 8).toUpperCase(),
        type: 'other',
        clientId,
        description: 'Synthetic project for isolated browser tests',
        startDate: formatUtcDate(today),
        endDate: formatUtcDate(endDate),
      },
    },
    201,
  );
  const projectId = requireUuid(project.id, 'project');
  await requestJson(
    api,
    'PATCH',
    '/api/projects/' + encodeURIComponent(projectId),
    {
      cookie: adminCookie,
      json: { planningEnabled: true, checklistTemplateId: templateId },
    },
    200,
  );

  const staff = await requestJson(
    api,
    'POST',
    '/api/staff',
    {
      cookie: adminCookie,
      json: {
        firstName: 'E2E',
        lastName: 'Staff ' + suffix,
        position: 'Synthetic staff member',
        hireDate: formatUtcDate(today),
      },
    },
    201,
  );
  const staffMemberId = requireUuid(staff.id, 'staff member');

  const supplier = await requestJson(
    api,
    'POST',
    '/api/suppliers',
    { cookie: adminCookie, json: { name: 'E2E Supplier ' + suffix } },
    201,
  );
  const supplierId = requireUuid(supplier.id, 'supplier');

  const equipment = await requestJson(
    api,
    'POST',
    '/api/equipment',
    { cookie: adminCookie, json: { name: 'E2E Equipment ' + suffix } },
    201,
  );
  const equipmentId = requireUuid(equipment.id, 'equipment');

  const todayValue = formatUtcDate(today);
  const staffReference = await requestJson(
    api,
    'POST',
    '/api/projects/' + encodeURIComponent(projectId) + '/documents',
    {
      cookie: adminCookie,
      multipart: createMultipartForm({
        payload: JSON.stringify({
          name: 'E2E Staff Archive Reference ' + suffix,
          type: 'invoice',
          date: todayValue,
          amount: 1,
          status: 'pending',
          direction: 'expense',
        }),
      }),
    },
    201,
  );
  const staffReferenceId = requireUuid(staffReference.id, 'staff reference document');
  const linkedReference = await pool.query(
    'UPDATE public.documents SET staff_member_id = $1 WHERE id = $2 RETURNING id',
    [staffMemberId, staffReferenceId],
  );
  if (linkedReference.rowCount !== 1) {
    fail('The fixture could not link the staff archive reference.');
  }

  const notificationFileName = 'e2e-notification-' + suffix + '.pdf';
  const extractionPath = '/api/projects/' + encodeURIComponent(projectId) + '/documents/extract';
  const extraction = await api.request('POST', extractionPath, {
    cookie: adminCookie,
    multipart: createMultipartForm(
      {},
      {
        filename: notificationFileName,
        contentType: 'application/pdf',
        bytes: createPdf(),
      },
    ),
  });
  expectStatus(extraction, 422, extractionPath);

  const notifications = await requestJson(
    api,
    'GET',
    '/api/notifications?page=1&size=50&status=all',
    { cookie: adminCookie },
    200,
  );
  if (!Array.isArray(notifications.items)) {
    fail('The application API did not return its notification page.');
  }
  const notification = notifications.items.find(
    (item) =>
      item.type === 'document_extraction_failed' && item.context?.subject === notificationFileName,
  );
  const notificationId = requireUuid(notification?.id, 'notification');

  const extractionHintId = randomUUID();
  const extractionHintIssuer = 'E2E Extraction Issuer ' + suffix;
  const extractionHintValue = 'E2E-INV-' + suffix.slice(0, 8).toUpperCase();
  const extractionHint = await pool.query(
    'INSERT INTO public.invoice_extraction_hints ' +
      '(id, issuer_name, issuer_tax_id, field, anchor_kind, anchor_label, line_offset, sample_value, occurrences) ' +
      'VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8) RETURNING id',
    [
      extractionHintId,
      extractionHintIssuer,
      'invoiceNumber',
      'inline',
      'Invoice number',
      0,
      extractionHintValue,
      2,
    ],
  );
  if (extractionHint.rowCount !== 1 || extractionHint.rows[0]?.id !== extractionHintId) {
    fail('The fixture could not seed its synthetic extraction hint.');
  }

  return {
    clientId,
    projectId,
    staffMemberId,
    supplierId,
    equipmentId,
    templateId,
    notificationId,
    extractionHintId,
  };
}

async function createScenario(api, pool, environment, input, suffix) {
  if (input.scenario === 'fresh') {
    const status = await requestJson(api, 'GET', '/api/auth/status', undefined, 200);
    if (status.bootstrapNeeded !== true || status.authenticated !== false) {
      fail('The fresh fixture did not leave bootstrap available.');
    }
    return { actors: {}, ids: {} };
  }

  const adminCookie = await createFounderSession(pool, api, environment.bootstrapEmail);
  const actors = { admin: adminCookie };
  if (input.scenario === 'onboarding') return { actors, ids: {} };

  const ids = await createConfiguredData(api, pool, adminCookie, suffix);
  actors.readonly = await inviteMember(api, adminCookie, 'readonly', suffix);
  actors.restricted = await inviteMember(api, adminCookie, 'restricted', suffix);
  actors.staffProfileOnly = await inviteMember(api, adminCookie, 'staffProfileOnly', suffix);
  return { actors, ids };
}

async function run() {
  if (process.argv.length !== 5 || process.argv[2] !== 'reset') {
    fail('Usage: node /fixture/playwright-fixture.mjs reset <base64url-json> <ca-base64>');
  }

  const input = decodeBase64UrlJson(process.argv[3]);
  const caPem = decodeCertificate(process.argv[4]);
  const environment = validateRuntimeEnvironment(input);
  const pool = createDatabasePool(environment);
  const api = createApiClient(input.origin, caPem, input.testClientAddress);
  const suffix = randomBytes(8).toString('hex');
  let fixture;

  try {
    await resetDatabase(pool, environment.database, environment.user);
    const scenario = await createScenario(api, pool, environment, input, suffix);
    if (input.scenario !== 'fresh') {
      await acknowledgeRelease(
        api,
        scenario.actors,
        input.currentReleaseVersion,
        input.acknowledgeRelease,
      );
    }

    fixture = {
      actors: scenario.actors,
      bootstrapEmail: environment.bootstrapEmail,
      currentReleaseVersion: input.currentReleaseVersion,
      ids: scenario.ids,
      infectedMarker: INFECTED_MARKER,
    };
  } finally {
    api.close();
    await pool.end();
  }

  process.stdout.write(RESULT_MARKER + JSON.stringify(fixture) + '\n');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch((error) => {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`The isolated Playwright fixture reset failed: ${reason}\n`);
    process.exitCode = 1;
  });
}
