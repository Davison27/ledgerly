import { Outlet } from '@tanstack/react-router';
import { Layout } from 'antd';
import { TopBar } from './TopBar';

/**
 * Layout de la aplicación autenticada: barra superior fija + contenido debajo.
 * Envuelve las rutas internas (empresas, proyectos, …).
 */
export function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <TopBar />
      <Layout.Content
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
