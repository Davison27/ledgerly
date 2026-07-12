import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { AppLayout } from '../components/layout/AppLayout';
import { RootLayout } from '../components/layout/RootLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { EnterprisesPage } from '../features/enterprises/EnterprisesPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LoginPage,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: AppLayout,
});

const enterprisesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/enterprises',
  component: EnterprisesPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/projects/$enterpriseId',
  component: ProjectsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  appLayoutRoute.addChildren([enterprisesRoute, projectsRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
