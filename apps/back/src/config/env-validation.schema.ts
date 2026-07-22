import * as Joi from 'joi';

// Valida process.env al arrancar (composition root, ver main.ts/app.module.ts):
// un despliegue con una variable ausente o mal puesta debe fallar en el
// bootstrap, no en la primera petición del usuario. FRONTEND_URL es el caso
// concreto que motiva esto: sin validar, su ausencia cae silenciosamente al
// default de localhost y el CORS de producción queda apuntando a un origen
// que no es el real.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().default('http://localhost:5173'),
  }),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
});
