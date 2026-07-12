
export const USE_MOCKS = import.meta.env.MODE === 'mock';

if (USE_MOCKS && import.meta.env.DEV) {
  console.info(
    '%c[mocks] Datos mock activados (modo local)',
    'color:#1c5d97;font-weight:600',
  );
}
