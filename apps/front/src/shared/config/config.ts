export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3005/api';

export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:3005' : undefined);
