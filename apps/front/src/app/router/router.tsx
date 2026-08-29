import { lazy, Suspense, type ComponentType } from 'react';
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { AppShell } from './AppShell';
import { RootLayout } from './RootLayout';
import { SessionGuard } from '@/widgets/app-layout';
import { LoginPage } from '@/pages/login';
import { OnboardingPage } from '@/pages/onboarding';
import type { ProjectDetailSection } from '@/pages/project-detail';
import type { StaffDetailSection } from '@/pages/staff-detail';
import type { WorkspaceTab } from '@/pages/workspace';

interface LoginSearch {
  authError?: string;
  sessionExpired?: boolean;
  signedOut?: boolean;
}

const routeFallback = <div role="status">Cargando página…</div>;

function withRouteFallback(Component: ComponentType) {
  return function LazyRoute() {
    return (
      <Suspense fallback={routeFallback}>
        <Component />
      </Suspense>
    );
  };
}

const DashboardPage = withRouteFallback(lazy(() => import('@/pages/dashboard').then(({ DashboardPage }) => ({ default: DashboardPage }))));
const ProjectsPage = withRouteFallback(lazy(() => import('@/pages/projects').then(({ ProjectsPage }) => ({ default: ProjectsPage }))));
const ProjectDetailPage = withRouteFallback(lazy(() => import('@/pages/project-detail').then(({ ProjectDetailPage }) => ({ default: ProjectDetailPage }))));
const CalendarPage = withRouteFallback(lazy(() => import('@/pages/calendar').then(({ CalendarPage }) => ({ default: CalendarPage }))));
const DocumentsPage = withRouteFallback(lazy(() => import('@/pages/documents').then(({ DocumentsPage }) => ({ default: DocumentsPage }))));
const ExtractionHintsPage = withRouteFallback(lazy(() => import('@/pages/extraction-hints').then(({ ExtractionHintsPage }) => ({ default: ExtractionHintsPage }))));
const SuppliersPage = withRouteFallback(lazy(() => import('@/pages/suppliers').then(({ SuppliersPage }) => ({ default: SuppliersPage }))));
const EquipmentPage = withRouteFallback(lazy(() => import('@/pages/equipment').then(({ EquipmentPage }) => ({ default: EquipmentPage }))));
const StaffPage = withRouteFallback(lazy(() => import('@/pages/staff').then(({ StaffPage }) => ({ default: StaffPage }))));
const StaffMemberDetailPage = withRouteFallback(lazy(() => import('@/pages/staff-detail').then(({ StaffMemberDetailPage }) => ({ default: StaffMemberDetailPage }))));
const WorkspacePage = withRouteFallback(lazy(() => import('@/pages/workspace').then(({ WorkspacePage }) => ({ default: WorkspacePage }))));

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
  validateSearch: (search: Record<string, unknown>): { section?: ProjectDetailSection } => ({
    section:
      search.section === 'equipment' ||
      search.section === 'dashboard' ||
      search.section === 'schedule' ||
      search.section === 'settings'
        ? search.section
        : undefined,
  }),
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
  validateSearch: (search: Record<string, unknown>): { supplierId?: string } => ({
    supplierId: typeof search.supplierId === 'string' ? search.supplierId : undefined,
  }),
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

const equipmentRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/equipment',
  component: EquipmentPage,
});

const staffRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/staff',
  component: StaffPage,
});

const staffMemberDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/staff/$staffMemberId',
  validateSearch: (search: Record<string, unknown>): { section?: StaffDetailSection } => ({
    section:
      search.section === 'payrolls' || search.section === 'schedule' ? search.section : undefined,
  }),
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
    equipmentRoute,
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
