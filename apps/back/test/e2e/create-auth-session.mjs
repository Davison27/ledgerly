import { createRequire } from 'node:module';

const runtimeRequire = createRequire('/app/dist/lib/auth.js');
const { auth } = runtimeRequire('/app/dist/lib/auth.js');
const { makeSignature } = await import(runtimeRequire.resolve('better-auth/crypto'));
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export async function createAuthSession(email) {
  if (typeof email !== 'string' || !emailPattern.test(email)) {
    throw new Error('An E2E user email is required.');
  }

  const context = await auth.$context;
  let user = await context.internalAdapter.findUserByEmail(email);
  if (!user) {
    user = await context.internalAdapter.createUser(
      {
        email,
        emailVerified: true,
        image: null,
        name: email.split('@', 1)[0],
      },
      { method: 'test' },
    );
  }

  const session = await context.internalAdapter.createSession(user.id);
  const signature = await makeSignature(session.token, context.secret);
  const cookie = context.authCookies.sessionToken;
  const attributes = cookie.attributes;
  if (!attributes.secure) throw new Error('The production E2E session cookie must be secure.');

  return {
    email: user.email,
    cookie: {
      name: cookie.name,
      value: `${session.token}.${signature}`,
      path: attributes.path ?? '/',
      httpOnly: attributes.httpOnly ?? true,
      secure: attributes.secure,
      sameSite: 'Lax',
    },
  };
}

async function main() {
  const email = process.argv[2];
  if (!email || process.argv.length !== 3) throw new Error('Usage: create-auth-session.mjs <email>');
  process.stdout.write(`${JSON.stringify(await createAuthSession(email))}\n`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Unable to create E2E session.'}\n`);
    process.exitCode = 1;
  });
}
