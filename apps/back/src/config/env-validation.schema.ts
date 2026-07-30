import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().uri({ scheme: ['https'] }).required(),
    otherwise: Joi.string().uri().default('http://localhost:5173'),
  }),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),

  BETTER_AUTH_SECRET: Joi.string().min(32).required(),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  BOOTSTRAP_ADMIN_EMAIL: Joi.string().email().required(),
  BACKEND_PUBLIC_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().uri({ scheme: ['https'] }).required(),
    otherwise: Joi.string().uri().default('http://localhost:3005'),
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
  PDF_OCR_ENABLED: Joi.boolean().default(true),
  PDF_OCR_LANGUAGE: Joi.string().default('spa'),
  PDF_OCR_MAX_PAGES: Joi.number().integer().min(1).max(50).default(12),
  PDF_OCR_TIMEOUT_SECONDS: Joi.number().integer().min(10).max(300).default(90),
});
