import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useCurrentUser } from './hooks/useCurrentUser';
import { useIsCallerAdmin } from './hooks/useQueries';
import { useSafeActor } from './hooks/useSafeActor';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from './components/layout/AppShell';
import { ProfileSetupModal } from './components/auth/ProfileSetupModal';
import { NoProfileBlockedScreen } from './components/auth/NoProfileBlockedScreen';
import { BootstrapErrorScreen } from './components/auth/BootstrapErrorScreen';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage';
import { KarigarDashboardPage } from './pages/karigar/KarigarDashboardPage';
import { MasterDesignsPage } from './pages/admin/MasterDesignsPage';
import { IngestOrdersPage } from './pages/staff/IngestOrdersPage';
import { UnmappedDesignCodesPage } from './pages/staff/UnmappedDesignCodesPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { BootstrapAdminPage } from './pages/setup/BootstrapAdminPage';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';
import { RoleGate } from './components/auth/RoleGate';
import { AppRole } from './backend';
import { useEffect, useState } from 'react';

function Layout() {
  const { identity } = useInternetIdentity();
  const { actor: safeActor, isError: actorError, error: actorErrorObj, refetch: refetchActor } = useSafeActor();
  const { userProfile, isLoading: profileLoading, isFetched, isError: profileError, error: profileErrorObj, refetch: refetchProfile } = useCurrentUser();
  const { data: isAdmin, isLoading: isCheckingAdmin, isError: adminCheckError, error: adminCheckErrorObj, refetch: refetchAdmin } = useIsCallerAdmin();
  const isAuthenticated = !!identity;
  
  // Bootstrap watchdog: detect prolonged loading states
  const [bootstrapStartTime] = useState(() => Date.now());
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // If we're still loading after 15 seconds, consider it a timeout
    const timeoutId = setTimeout(() => {
      const isStillLoading = (profileLoading || !isFetched || isCheckingAdmin) && !profileError && !adminCheckError && !actorError;
      if (isStillLoading) {
        console.error('[bootstrap/timeout] Bootstrap exceeded 15s timeout - likely stuck');
        setHasTimedOut(true);
      }
    }, 15000);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, profileLoading, isFetched, isCheckingAdmin, profileError, adminCheckError, actorError]);

  // Reset timeout flag when errors clear or loading completes
  useEffect(() => {
    if (hasTimedOut && (!profileLoading && isFetched && !isCheckingAdmin)) {
      setHasTimedOut(false);
    }
  }, [hasTimedOut, profileLoading, isFetched, isCheckingAdmin]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Check for bootstrap errors (actor creation, profile fetch, or admin check)
  const hasBootstrapError = actorError || profileError || adminCheckError || hasTimedOut;
  const bootstrapError = hasTimedOut 
    ? new Error('Bootstrap timed out after 15 seconds. This may indicate a network issue or the backend is not responding.')
    : (actorErrorObj || profileErrorObj || adminCheckErrorObj);

  if (hasBootstrapError) {
    const handleRetry = async () => {
      console.log('[bootstrap/retry] Retrying bootstrap...');
      setHasTimedOut(false);
      // First refetch the actor
      await refetchActor();
      // Then refetch dependent queries
      if (profileError || hasTimedOut) await refetchProfile();
      if (adminCheckError || hasTimedOut) await refetchAdmin();
    };

    return <BootstrapErrorScreen error={bootstrapError} onRetry={handleRetry} />;
  }

  // Show loading only if:
  // 1. Actor exists (or is being fetched)
  // 2. Profile or admin check is still loading
  // 3. Profile hasn't been fetched yet
  // Don't show loading indefinitely if actor is missing or queries are disabled
  const isBootstrapping = (profileLoading || !isFetched || isCheckingAdmin);
  
  if (isBootstrapping) {
    const elapsedSeconds = Math.floor((Date.now() - bootstrapStartTime) / 1000);
    console.log(`[bootstrap/loading] Still loading... (${elapsedSeconds}s elapsed)`);
    
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading profile...</p>
          {elapsedSeconds > 5 && (
            <p className="text-xs text-muted-foreground mt-2">This is taking longer than usual...</p>
          )}
        </div>
      </div>
    );
  }

  // If user has no profile
  if (userProfile === null) {
    // If they are admin (first user), show admin setup modal
    if (isAdmin) {
      return <ProfileSetupModal open={true} />;
    }
    // Otherwise, block them and show instructions
    return <NoProfileBlockedScreen />;
  }

  // User has a profile, show the app
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function IndexPage() {
  const { userProfile } = useCurrentUser();
  
  if (!userProfile) {
    return <div className="p-8">Loading...</div>;
  }

  switch (userProfile.appRole) {
    case AppRole.Admin:
      return <AdminDashboardPage />;
    case AppRole.Staff:
      return <StaffDashboardPage />;
    case AppRole.Karigar:
      return <KarigarDashboardPage />;
    default:
      return <div className="p-8">Unknown role</div>;
  }
}

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <AdminDashboardPage />
    </RoleGate>
  ),
});

const masterDesignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/master-designs',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <MasterDesignsPage />
    </RoleGate>
  ),
});

const userManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <UserManagementPage />
    </RoleGate>
  ),
});

const staffDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin, AppRole.Staff]}>
      <StaffDashboardPage />
    </RoleGate>
  ),
});

const ingestOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/ingest',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin, AppRole.Staff]}>
      <IngestOrdersPage />
    </RoleGate>
  ),
});

const unmappedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/unmapped',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin, AppRole.Staff]}>
      <UnmappedDesignCodesPage />
    </RoleGate>
  ),
});

const karigarDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/karigar',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Karigar]}>
      <KarigarDashboardPage />
    </RoleGate>
  ),
});

const bootstrapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup/bootstrap',
  component: BootstrapAdminPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminDashboardRoute,
  masterDesignsRoute,
  userManagementRoute,
  staffDashboardRoute,
  ingestOrdersRoute,
  unmappedRoute,
  karigarDashboardRoute,
  bootstrapRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
