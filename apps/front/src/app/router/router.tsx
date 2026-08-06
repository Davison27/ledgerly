import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { AppShell } from './AppShell';
import { RootLayout } from './RootLayout';
import { SessionGuard } from '@/widgets/app-layout';
import { LoginPage } from '@/pages/login';
import { OnboardingPage } from '@/pages/onboarding';
import { DashboardPage } from '@/pages/dashboard';
import { ProjectsPage } from '@/pages/projects';
import { ProjectDetailPage } from '@/pages/project-detail';
import { CalendarPage } from '@/pages/calendar';
import { ExtractionHintsPage } from '@/pages/extraction-hints';
import { SuppliersPage } from '@/pages/suppliers';
import { DocumentsPage } from '@/pages/documents';
import { InvoicesPage } from '@/pages/invoices';
import { ProductsPage } from '@/pages/products';
import { StaffPage } from '@/pages/staff';
import { StaffMemberDetailPage } from '@/pages/staff-detail';
import { WorkspacePage, type WorkspaceTab } from '@/pages/workspace';

interface LoginSearch {
  authError?: string;
  sessionExpired?: boolean;
  signedOut?: boolean;
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    authError: typeof search.authError === 'string' ? search.authError : undefined,
    sessionExpired: search.sessionExpired === true ? true : undefined,
    signedOut: search.signedOut === true ? true : undefined,
  }),
  component: LoginPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: () => (
    <SessionGuard>
      <OnboardingPage />
    </SessionGuard>
  ),
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: () => (
    <SessionGuard>
      <AppShell />
    </SessionGuard>
  ),
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

const calendarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/calendar',
  component: CalendarPage,
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

const workspaceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/workspace',
  validateSearch: (search: Record<string, unknown>): { tab: WorkspaceTab } => ({
    tab:
      search.tab === 'members' || search.tab === 'integrations' || search.tab === 'tax-compliance'
        ? search.tab
        : 'company',
  }),
  component: WorkspacePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    projectsRoute,
    projectDetailRoute,
    calendarRoute,
    documentsRoute,
    extractionHintsRoute,
    suppliersRoute,
    invoicesRoute,
    productsRoute,
    staffRoute,
    staffMemberDetailRoute,
    workspaceRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
