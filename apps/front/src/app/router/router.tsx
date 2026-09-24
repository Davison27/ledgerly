import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { createRootRoute, createRoute, createRouter, Link, Navigate, useParams, useSearch } from '@tanstack/react-router';
import { Flex, Result, Spin } from 'antd';
import { useIsFetching } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AppShell } from './AppShell';
import { RootLayout } from './RootLayout';
import styles from './router.module.css';
import { SessionGuard } from '@/widgets/app-layout';
import { useWorkspaceAccess, type WorkspaceModuleDto } from '@/entities/workspace-member';
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

const ROUTE_FALLBACK_DELAY_MS = 120;

function RouteLoadingIndicator() {
  const { t } = useTranslation();

  return (
    <Flex className={styles.fallback} align="center" justify="center">
      <Flex vertical align="center" gap="small" role="status" aria-live="polite" className={styles.status}>
        <Spin />
        <span>{t('common.loadingPage')}</span>
      </Flex>
    </Flex>
  );
}

export function RouteFallback({ onVisible }: { onVisible?: () => void } = {}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsVisible(true);
      onVisible?.();
    }, ROUTE_FALLBACK_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [onVisible]);

  if (!isVisible) return null;

  return <RouteLoadingIndicator />;
}

type HomeRoute =
  | '/dashboard'
  | '/companies'
  | '/calendar'
  | '/documents'
  | '/suppliers'
  | '/equipment'
  | '/staff';

function getHomeRoute(
  canAccess: (module: WorkspaceModuleDto, level: 'view') => boolean,
): HomeRoute | null {
  if (canAccess('dashboard', 'view')) return '/dashboard';
  if (canAccess('projects', 'view')) return '/companies';
  if (canAccess('calendar', 'view')) return '/calendar';
  if (canAccess('documents', 'view')) return '/documents';
  if (canAccess('suppliers', 'view')) return '/suppliers';
  if (canAccess('equipment', 'view')) return '/equipment';
  if (canAccess('staff', 'view')) return '/staff';
  return null;
}

export function findAccessibleNestedSection<Section extends string>(
  selected: Section,
  requirements: Readonly<Record<Section, readonly WorkspaceModuleDto[]>>,
  order: readonly Section[],
  canAccess: (module: WorkspaceModuleDto, level: 'view') => boolean,
): Section | null {
  const hasAccess = (section: Section) => requirements[section].every((module) => canAccess(module, 'view'));
  return hasAccess(selected) ? selected : order.find(hasAccess) ?? null;
}

function NoSectionsState() {
  const { t } = useTranslation();

  return (
    <Result
      status="403"
      title={t('access.noSections.title')}
      subTitle={t('access.noSections.description')}
    />
  );
}

function AccessDeniedState() {
  const { t } = useTranslation();
  const { canAccess, isPending } = useWorkspaceAccess();
  const destination = getHomeRoute(canAccess);

  if (isPending) return <RouteFallback />;
  if (!destination) return <NoSectionsState />;
  return (
    <Result
      status="403"
      title={t('access.denied.title')}
      subTitle={t('access.denied.description')}
      extra={<Link to={destination}>{t('access.denied.action')}</Link>}
    />
  );
}

function SectionAccessGuard({
  modules,
  children,
}: {
  modules: readonly WorkspaceModuleDto[];
  children: ReactNode;
}) {
  const { canAccess, isPending } = useWorkspaceAccess();

  if (isPending) return <RouteFallback />;
  if (modules.every((module) => canAccess(module, 'view'))) return <>{children}</>;
  return <AccessDeniedState />;
}

function AdminAccessGuard({ children }: { children: ReactNode }) {
  const { isAdmin, isPending } = useWorkspaceAccess();

  if (isPending) return <RouteFallback />;
  if (isAdmin) return <>{children}</>;
  return <AccessDeniedState />;
}

export const projectSectionModules: Record<ProjectDetailSection, readonly WorkspaceModuleDto[]> = {
  documents: ['projects', 'documents'],
  equipment: ['projects', 'equipment'],
  dashboard: ['projects', 'dashboard'],
  schedule: ['projects', 'calendar'],
  settings: ['projects'],
};

const projectSectionOrder: readonly ProjectDetailSection[] = [
  'documents',
  'equipment',
  'dashboard',
  'schedule',
  'settings',
];

function ProjectDetailAccessGuard() {
  const { canAccess, isPending } = useWorkspaceAccess();
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const search = useSearch({ strict: false }) as { section?: ProjectDetailSection };
  const section = search.section ?? 'documents';

  if (isPending) return <RouteFallback />;
  if (!canAccess('projects', 'view')) return <AccessDeniedState />;
  const availableSection = findAccessibleNestedSection(
    section,
    projectSectionModules,
    projectSectionOrder,
    canAccess,
  );

  if (!availableSection) return <AccessDeniedState />;
  if (availableSection === section) return <ProjectDetailPage />;
  return (
    <Navigate
      to="/projects/$projectId"
      params={{ projectId }}
      search={{ section: availableSection }}
      replace
    />
  );
}

export const staffSectionModules = {
  documents: ['staff', 'documents'],
  payrolls: ['staff', 'documents'],
  schedule: ['staff', 'calendar', 'projects'],
  profile: ['staff'],
} as const satisfies Record<StaffDetailSection, readonly WorkspaceModuleDto[]>;

const staffSectionOrder: readonly StaffDetailSection[] = ['documents', 'payrolls', 'schedule', 'profile'];

function StaffDetailAccessGuard() {
  const { canAccess, isPending } = useWorkspaceAccess();
  const { staffMemberId } = useParams({ strict: false }) as { staffMemberId: string };
  const search = useSearch({ strict: false }) as { section?: StaffDetailSection };
  const section = search.section ?? 'documents';

  if (isPending) return <RouteFallback />;
  if (!canAccess('staff', 'view')) return <AccessDeniedState />;
  const availableSection = findAccessibleNestedSection(
    section,
    staffSectionModules,
    staffSectionOrder,
    canAccess,
  );

  if (!availableSection) return <AccessDeniedState />;
  if (availableSection === section) return <StaffMemberDetailPage />;
  return (
    <Navigate
      to="/staff/$staffMemberId"
      params={{ staffMemberId }}
      search={{ section: availableSection }}
      replace
    />
  );
}

function RouteContent({
  Component,
  onMounted,
}: {
  Component: ComponentType;
  onMounted: () => void;
}) {
  useEffect(() => {
    onMounted();
  }, [onMounted]);

  return <Component />;
}

function withRouteFallback(Component: ComponentType) {
  return function LazyRoute() {
    const pendingInitialQueries = useIsFetching({
      predicate: (query) => query.state.data === undefined && query.state.fetchStatus === 'fetching',
    });
    const [loaderShown, setLoaderShown] = useState(false);
    const [contentMounted, setContentMounted] = useState(false);
    const [contentReady, setContentReady] = useState(false);
    const markLoaderShown = useCallback(() => setLoaderShown(true), []);
    const markContentMounted = useCallback(() => setContentMounted(true), []);

    useEffect(() => {
      if (!loaderShown || !contentMounted || contentReady || pendingInitialQueries > 0) return;

      const timeout = window.setTimeout(() => {
        setContentReady(true);
      }, ROUTE_FALLBACK_DELAY_MS);

      return () => {
        window.clearTimeout(timeout);
      };
    }, [contentMounted, contentReady, loaderShown, pendingInitialQueries]);

    const keepLoader = loaderShown && !contentReady;

    return (
      <Suspense fallback={<RouteFallback onVisible={markLoaderShown} />}>
        <div hidden={keepLoader}>
          <RouteContent Component={Component} onMounted={markContentMounted} />
        </div>
        {keepLoader && <RouteLoadingIndicator />}
      </Suspense>
    );
  };
}

const DashboardPage = withRouteFallback(lazy(() => import('@/pages/dashboard').then(({ DashboardPage }) => ({ default: DashboardPage }))));
const CompaniesPage = withRouteFallback(lazy(() => import('@/pages/companies').then(({ CompaniesPage }) => ({ default: CompaniesPage }))));
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
const ChangelogPage = withRouteFallback(lazy(() => import('@/pages/changelog').then(({ ChangelogPage }) => ({ default: ChangelogPage }))));

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
      <AdminAccessGuard>
        <OnboardingPage />
      </AdminAccessGuard>
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
  component: () => <SectionAccessGuard modules={['dashboard']}><DashboardPage /></SectionAccessGuard>,
});

const companiesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/companies',
  component: () => <SectionAccessGuard modules={['projects']}><CompaniesPage /></SectionAccessGuard>,
});

const companyProjectsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/companies/$clientId/projects',
  component: () => <SectionAccessGuard modules={['projects']}><ProjectsPage /></SectionAccessGuard>,
});

const projectsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/projects',
  component: () => <Navigate to="/companies" replace />,
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
  component: ProjectDetailAccessGuard,
});

const calendarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/calendar',
  component: () => <SectionAccessGuard modules={['calendar']}><CalendarPage /></SectionAccessGuard>,
});

const documentsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/documents',
  validateSearch: (search: Record<string, unknown>): { supplierId?: string } => ({
    supplierId: typeof search.supplierId === 'string' ? search.supplierId : undefined,
  }),
  component: () => <SectionAccessGuard modules={['documents']}><DocumentsPage /></SectionAccessGuard>,
});

const extractionHintsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/extraction-hints',
  component: () => <SectionAccessGuard modules={['documents']}><ExtractionHintsPage /></SectionAccessGuard>,
});

const suppliersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/suppliers',
  component: () => <SectionAccessGuard modules={['suppliers']}><SuppliersPage /></SectionAccessGuard>,
});

const equipmentRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/equipment',
  component: () => <SectionAccessGuard modules={['equipment']}><EquipmentPage /></SectionAccessGuard>,
});

const staffRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/staff',
  component: () => <SectionAccessGuard modules={['staff']}><StaffPage /></SectionAccessGuard>,
});

const staffMemberDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/staff/$staffMemberId',
  validateSearch: (search: Record<string, unknown>): { section?: StaffDetailSection } => ({
    section:
      search.section === 'documents' ||
      search.section === 'payrolls' ||
      search.section === 'schedule' ||
      search.section === 'profile'
        ? search.section
        : undefined,
  }),
  component: StaffDetailAccessGuard,
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
  component: () => <AdminAccessGuard><WorkspacePage /></AdminAccessGuard>,
});

const changelogRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/changelog',
  component: ChangelogPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    companiesRoute,
    companyProjectsRoute,
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
    changelogRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
