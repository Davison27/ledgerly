import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { AppLayout } from '../components/layout/AppLayout';
import { RootLayout } from '../components/layout/RootLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ExtractionHintsPage } from '../features/extraction-hints/ExtractionHintsPage';
import { SuppliersPage } from '../features/suppliers/SuppliersPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { InvoicesPage } from '../features/invoices/InvoicesPage';
import { ProductsPage } from '../features/products/ProductsPage';
import { StaffPage } from '../features/staff/StaffPage';
import { StaffMemberDetailPage } from '../features/staff/StaffMemberDetailPage';

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

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
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

const documentsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/documents',
  component: DocumentsPage,
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

const invoicesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/invoices',
  component: InvoicesPage,
});

const productsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/products',
  component: ProductsPage,
});

const staffRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/staff',
  component: StaffPage,
});

const staffMemberDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/staff/$staffMemberId',
  component: StaffMemberDetailPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    projectsRoute,
    projectDetailRoute,
    documentsRoute,
    extractionHintsRoute,
    suppliersRoute,
    invoicesRoute,
    productsRoute,
    staffRoute,
    staffMemberDetailRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
