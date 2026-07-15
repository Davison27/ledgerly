
export const USE_MOCKS = import.meta.env.MODE === 'mock';

// The backend mounts every route under the global '/api' prefix (see apps/back main.ts).
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';

if (USE_MOCKS && import.meta.env.DEV) {
  console.info(
    '%c[mocks] Datos mock activados (modo local)',
    'color:#1c5d97;font-weight:600',
  );
}
