import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { AppLayout } from '../components/layout/AppLayout';
import { RootLayout } from '../components/layout/RootLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ExtractionHintsPage } from '../features/extraction-hints/ExtractionHintsPage';
import { SuppliersPage } from '../features/suppliers/SuppliersPage';

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LoginPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingPage,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: AppLayout,
});

const projectsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/projects',
  component: ProjectsPage,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/projects/$projectId',
  component: ProjectDetailPage,
});

const extractionHintsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/extraction-hints',
  component: ExtractionHintsPage,
});

const suppliersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/suppliers',
  component: SuppliersPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  appLayoutRoute.addChildren([
    projectsRoute,
    projectDetailRoute,
    extractionHintsRoute,
    suppliersRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
