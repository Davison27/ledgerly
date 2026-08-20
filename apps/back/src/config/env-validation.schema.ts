import * as Joi from 'joi';

function exactOrigin(schemes: string[]) {
  return Joi.string()
    .uri({ scheme: schemes })
    .custom((value, helpers) => {
      if (typeof value !== 'string') {
        return helpers.error('any.invalid');
      }

      const parsed = new URL(value);
      if (
        parsed.username ||
        parsed.password ||
        parsed.pathname !== '/' ||
        parsed.search ||
        parsed.hash
      ) {
        return helpers.error('any.invalid');
      }

      return value;
    });
}

const httpOrigin = exactOrigin(['http', 'https']);
const httpsOrigin = exactOrigin(['https']);

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  FRONTEND_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: httpsOrigin.required(),
    otherwise: httpOrigin.default('http://localhost:5173'),
  }),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().integer().min(1).max(65535).required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_TYPEORM_POOL_MAX: Joi.number().integer().min(1).required(),
  DB_AUTH_POOL_MAX: Joi.number().integer().min(1).required(),
  DB_MIGRATOR_POOL_MAX: Joi.number().integer().min(1).required(),
  DB_IDLE_TIMEOUT_MS: Joi.number().integer().min(1).required(),
  DB_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(1).required(),
  DB_STATEMENT_TIMEOUT_MS: Joi.number().integer().min(1).required(),
  DB_QUERY_TIMEOUT_MS: Joi.number().integer().min(1).required(),
  DB_CONNECTION_BUDGET: Joi.number().integer().min(1).required(),
  MAX_LIST_ITEMS: Joi.number().integer().min(1).max(10000).default(500),
  MAX_PROJECT_EQUIPMENT_PER_PROJECT: Joi.number().integer().min(1).max(5000).default(100),
  MAX_CALENDAR_RANGE_DAYS: Joi.number().integer().min(1).max(3660).default(366),
  MAX_CALENDAR_RESULTS: Joi.number().integer().min(1).max(10000).default(1000),

  BETTER_AUTH_SECRET: Joi.string().min(32).required(),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  BOOTSTRAP_ADMIN_EMAIL: Joi.string().email().required(),
  BACKEND_PUBLIC_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: httpsOrigin.required(),
    otherwise: httpOrigin.default('http://localhost:3005'),
  }),
  COOKIE_SECURE: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().valid(true).required(),
    otherwise: Joi.boolean().default(false),
  }),
  TRUST_PROXY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().valid(true).required(),
    otherwise: Joi.boolean().default(false),
  }),
  STORED_FILE_ACTIVE_KEY_VERSION: Joi.string().pattern(/^v[1-9][0-9]{0,8}$/).required(),
  STORED_FILE_KEYS: Joi.string().min(1).required(),
  PDF_OCR_ENABLED: Joi.boolean().default(true),
  PDF_OCR_LANGUAGE: Joi.string().default('spa'),
  PDF_MAX_PAGES: Joi.number().integer().min(1).max(500).default(100),
  PDF_OCR_MAX_PAGES: Joi.number().integer().min(1).max(50).default(12),
  PDF_OCR_TIMEOUT_SECONDS: Joi.number().integer().min(10).max(300).default(90),
  PDF_UPLOAD_MAX_ACTIVE: Joi.number().integer().min(1).max(32).default(4),
  PDF_UPLOAD_MAX_QUEUED: Joi.number().integer().min(0).max(128).default(16),
  PDF_UPLOAD_QUEUE_TIMEOUT_MS: Joi.number().integer().min(100).max(120000).default(15000),
  PDF_READER_MAX_ACTIVE: Joi.number().integer().min(1).max(16).default(2),
  PDF_READER_MAX_QUEUED: Joi.number().integer().min(0).max(64).default(8),
  PDF_READER_QUEUE_TIMEOUT_MS: Joi.number().integer().min(100).max(120000).default(30000),
  PDF_RETRY_AFTER_SECONDS: Joi.number().integer().min(1).max(300).default(15),
  PDF_MAX_EXTRACTED_TEXT_BYTES: Joi.number().integer().min(1024).max(10 * 1024 * 1024).default(2 * 1024 * 1024),
  PDF_MAX_ATTACHMENTS: Joi.number().integer().min(0).max(100).default(20),
  PDF_MAX_ATTACHMENT_BYTES: Joi.number().integer().min(1024).max(20 * 1024 * 1024).default(5 * 1024 * 1024),
  PDF_MAX_TOTAL_ATTACHMENT_BYTES: Joi.number().integer().min(1024).max(100 * 1024 * 1024).default(20 * 1024 * 1024),
  PDF_MAX_OCR_OUTPUT_BYTES: Joi.number().integer().min(1024).max(50 * 1024 * 1024).default(20 * 1024 * 1024),
});
