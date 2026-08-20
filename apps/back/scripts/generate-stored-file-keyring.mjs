import { randomBytes } from 'node:crypto';

const key = randomBytes(32).toString('base64');

process.stdout.write(`STORED_FILE_ACTIVE_KEY_VERSION=v1\nSTORED_FILE_KEYS={"v1":"${key}"}\n`);
