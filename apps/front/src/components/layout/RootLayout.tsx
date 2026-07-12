import { Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

/**
 * Layout raíz de la aplicación: punto de montaje de todas las rutas.
 * Añade las devtools del router solo en desarrollo.
 */
export function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </>
  );
}
