import { createAuthClient } from 'better-auth/react';
import { BACKEND_URL } from '@/shared/config/config';

export const authClient = createAuthClient({
  ...(BACKEND_URL ? { baseURL: BACKEND_URL } : {}),
  fetchOptions: {
    credentials: 'include',
  },
});
