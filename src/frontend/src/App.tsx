import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useCurrentUser } from './hooks/useCurrentUser';
import { useIsCallerAdmin, useCheckUserBlocked } from './hooks/useQueries';
import { useEffectiveAppRole } from './hooks/useEffectiveAppRole';
import { useSafeActor } from './hooks/useSafeActor';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from './components/layout/AppShell';
import { ProfileSetupModal } from './components/auth/ProfileSetupModal';
import { NoProfileBlockedScreen } from './components/auth/NoProfileBlockedScreen';
import { BlockedUserScreen } from './components/auth/BlockedUserScreen';
import { BootstrapErrorScreen } from './components/auth/BootstrapErrorScreen';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage';
import { KarigarDashboardPage } from './pages/karigar/KarigarDashboardPage';
import { MasterDesignsPage } from './pages/admin/MasterDesignsPage';
import { DesignImagesPage } from './pages/admin/DesignImagesPage';
import { IngestOrdersPage } from './pages/staff/IngestOrdersPage';
import { UnmappedDesignCodesPage } from './pages/staff/UnmappedDesignCodesPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { ExcelReconciliationPage } from './pages/admin/ExcelReconciliationPage';
import { BarcodeTaggingPage } from './pages/admin/BarcodeTaggingPage';
import { HallmarkManagementPage } from './pages/admin/HallmarkManagementPage';
import { RoleGate } from './components/auth/RoleGate';
import { AppRole } from './backend';
import { useEffect } from 'react';

// Root route with layout
const rootRoute = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Outlet key={location.pathname} />
      <Toaster />
    </ThemeProvider>
  );
}

// Login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LoginPage,
});

// Protected routes wrapper
function ProtectedLayout() {
  const { identity, isInitializing } = useInternetIdentity();
  const { userProfile, isLoading: profileLoading, isFetched } = useCurrentUser();
  const { effectiveRole, isResolved } = useEffectiveAppRole();
  const { data: isBlocked, isLoading: blockedLoading } = useCheckUserBlocked();
  const { error: bootstrapError, isFetching: bootstrapLoading, refetch } = useSafeActor();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isInitializing && !identity) {
      navigate({ to: '/' });
    }
  }, [isInitializing, identity, navigate]);

  // Show bootstrap error screen if actor initialization failed
  if (bootstrapError) {
    return <BootstrapErrorScreen error={bootstrapError} onRetry={() => refetch()} />;
  }

  // Show loading while checking authentication and bootstrap
  if (isInitializing || bootstrapLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Not authenticated
  if (!identity) {
    return null;
  }

  // Show blocked screen if user is blocked
  if (isBlocked) {
    return <BlockedUserScreen />;
  }

  // Show profile setup modal for first-time admin
  const showProfileSetup = !profileLoading && isFetched && userProfile === null && effectiveRole === AppRole.Admin;
  if (showProfileSetup) {
    return (
      <AppShell>
        <ProfileSetupModal open={true} />
      </AppShell>
    );
  }

  // Show no-profile screen for non-admin users without profile
  if (!profileLoading && isFetched && userProfile === null && effectiveRole !== AppRole.Admin) {
    return <NoProfileBlockedScreen />;
  }

  // Show loading while profile is being fetched
  if (profileLoading || !isResolved) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedLayout,
});

// Admin routes
const adminRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <AdminDashboardPage />
    </RoleGate>
  ),
});

const masterDesignsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/master-designs',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <MasterDesignsPage />
    </RoleGate>
  ),
});

const designImagesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/design-images',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <DesignImagesPage />
    </RoleGate>
  ),
});

const excelReconciliationRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/excel-reconciliation',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <ExcelReconciliationPage />
    </RoleGate>
  ),
});

const barcodeTaggingRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/barcode-tagging',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <BarcodeTaggingPage />
    </RoleGate>
  ),
});

const hallmarkManagementRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/hallmark-management',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <HallmarkManagementPage />
    </RoleGate>
  ),
});

const usersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/users',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <UserManagementPage />
    </RoleGate>
  ),
});

// Staff routes
const staffRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/staff',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin, AppRole.Staff]}>
      <StaffDashboardPage />
    </RoleGate>
  ),
});

const ingestRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/staff/ingest',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin, AppRole.Staff]}>
      <IngestOrdersPage />
    </RoleGate>
  ),
});

const unmappedRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/staff/unmapped',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin, AppRole.Staff]}>
      <UnmappedDesignCodesPage />
    </RoleGate>
  ),
});

// Karigar routes
const karigarRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/karigar',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Karigar]}>
      <KarigarDashboardPage />
    </RoleGate>
  ),
});

// Create route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    adminRoute,
    masterDesignsRoute,
    designImagesRoute,
    excelReconciliationRoute,
    barcodeTaggingRoute,
    hallmarkManagementRoute,
    usersRoute,
    staffRoute,
    ingestRoute,
    unmappedRoute,
    karigarRoute,
  ]),
]);

// Create router
const router = createRouter({ routeTree });

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
