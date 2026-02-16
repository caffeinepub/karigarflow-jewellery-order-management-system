import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
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
import { BootstrapAdminPage } from './pages/setup/BootstrapAdminPage';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';
import { RoleGate } from './components/auth/RoleGate';
import { AppRole } from './backend';
import { useEffect } from 'react';

function Layout() {
  const { identity } = useInternetIdentity();
  const { actor: safeActor, isError: actorError, error: actorErrorObj, refetch: refetchActor } = useSafeActor();
  const { userProfile, isLoading: profileLoading, isFetched: profileFetched, isError: profileError, error: profileErrorObj, refetch: refetchProfile } = useCurrentUser();
  const { data: isAdmin, isLoading: isCheckingAdmin, isFetched: adminCheckFetched, isError: adminCheckError, error: adminCheckErrorObj, refetch: refetchAdmin } = useIsCallerAdmin();
  const { data: isBlocked, isLoading: checkingBlocked, isFetched: blockedCheckFetched } = useCheckUserBlocked();
  const isAuthenticated = !!identity;

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Check for bootstrap errors (actor creation, profile fetch, or admin check)
  const hasBootstrapError = actorError || profileError || adminCheckError;
  const bootstrapError = actorErrorObj || profileErrorObj || adminCheckErrorObj;

  if (hasBootstrapError) {
    const handleRetry = async () => {
      console.log('[bootstrap/retry] Retrying bootstrap...');
      // First refetch the actor
      await refetchActor();
      // Then refetch dependent queries
      await refetchProfile();
      await refetchAdmin();
    };

    return <BootstrapErrorScreen error={bootstrapError} onRetry={handleRetry} />;
  }

  // Show loading only when actively fetching and not yet resolved
  const isBootstrapping = (profileLoading && !profileFetched) || (isCheckingAdmin && !adminCheckFetched) || (checkingBlocked && !blockedCheckFetched);
  
  if (isBootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Check if user is blocked (non-admin users only)
  if (isBlocked && !isAdmin) {
    return <BlockedUserScreen />;
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
  const navigate = useNavigate();
  const { effectiveRole, isLoading, isResolved } = useEffectiveAppRole();
  
  // Wait for role to be fully resolved before routing
  useEffect(() => {
    if (!isResolved) {
      console.log('[IndexPage] Waiting for role resolution...');
      return;
    }
    
    if (!effectiveRole) {
      console.warn('[IndexPage] No effective role found after resolution');
      return;
    }

    console.log('[IndexPage] Routing to dashboard for role:', effectiveRole);

    // Route based on effective role
    switch (effectiveRole) {
      case AppRole.Admin:
        navigate({ to: '/admin', replace: true });
        break;
      case AppRole.Staff:
        navigate({ to: '/staff', replace: true });
        break;
      case AppRole.Karigar:
        navigate({ to: '/karigar', replace: true });
        break;
      default:
        console.warn('[IndexPage] Unknown role:', effectiveRole);
    }
  }, [effectiveRole, isResolved, navigate]);
  
  if (!isResolved) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!effectiveRole) {
    return <div className="p-8">Unable to determine user role</div>;
  }

  // This should not render as we navigate away, but provide fallback
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
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

const designImagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/design-images',
  component: () => (
    <RoleGate allowedRoles={[AppRole.Admin]}>
      <DesignImagesPage />
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
  designImagesRoute,
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
