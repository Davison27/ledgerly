// The backend mounts every route under the global '/api' prefix (see apps/back main.ts).
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';
