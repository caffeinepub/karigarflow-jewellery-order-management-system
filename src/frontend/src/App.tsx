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
import { Loader2 } from 'lucide-react';

// Root route with layout
const rootRoute = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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

// Loading component for authentication transitions
function AuthLoadingScreen({ message }: { message: string }) {
  return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <p className="text-xl font-semibold text-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// Protected routes wrapper
function ProtectedLayout() {
  const { identity, isInitializing } = useInternetIdentity();
  const { userProfile, isLoading: profileLoading, isFetched: profileFetched } = useCurrentUser();
  const { effectiveRole, isResolved: roleResolved, isLoading: roleLoading, hasError: roleError } = useEffectiveAppRole();
  const { data: isBlocked, isLoading: blockedLoading } = useCheckUserBlocked();
  const { error: bootstrapError, isFetching: bootstrapLoading, refetch: retryBootstrap, actor } = useSafeActor();
  const navigate = useNavigate();

  console.log('[ProtectedLayout] State:', {
    isInitializing,
    hasIdentity: !!identity,
    bootstrapLoading,
    bootstrapError: !!bootstrapError,
    profileLoading,
    profileFetched,
    roleLoading,
    roleResolved,
    roleError,
    effectiveRole,
    hasActor: !!actor,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isInitializing && !identity) {
      console.log('[ProtectedLayout] No identity detected, redirecting to login');
      navigate({ to: '/', replace: true });
    }
  }, [isInitializing, identity, navigate]);

  // Show bootstrap error screen if actor initialization failed
  if (bootstrapError) {
    console.error('[ProtectedLayout] Bootstrap error detected:', bootstrapError);
    return <BootstrapErrorScreen error={bootstrapError} onRetry={() => retryBootstrap()} />;
  }

  // Show loading while initializing identity
  if (isInitializing) {
    console.log('[ProtectedLayout] Identity initializing...');
    return <AuthLoadingScreen message="Initializing authentication" />;
  }

  // Show loading while actor is bootstrapping
  if (bootstrapLoading || !actor) {
    console.log('[ProtectedLayout] Actor bootstrapping...');
    return <AuthLoadingScreen message="Connecting to backend" />;
  }

  // Not authenticated - redirect will happen via useEffect
  if (!identity) {
    console.log('[ProtectedLayout] No identity, showing loading while redirecting');
    return <AuthLoadingScreen message="Redirecting to login" />;
  }

  // Show loading while profile is being fetched
  if (profileLoading || !profileFetched) {
    console.log('[ProtectedLayout] Profile loading...');
    return <AuthLoadingScreen message="Loading your profile" />;
  }

  // Show loading while role is being determined
  if (roleLoading || !roleResolved) {
    console.log('[ProtectedLayout] Role determining...');
    return <AuthLoadingScreen message="Determining access level" />;
  }

  // If role resolution failed, show error
  if (roleError) {
    console.error('[ProtectedLayout] Role resolution failed');
    return (
      <BootstrapErrorScreen 
        error={new Error('Unable to determine user role. Please try logging out and back in.')} 
        onRetry={() => retryBootstrap()} 
      />
    );
  }

  // Show blocked screen if user is blocked
  if (isBlocked) {
    console.log('[ProtectedLayout] User is blocked');
    return <BlockedUserScreen />;
  }

  // Show profile setup modal for first-time admin
  const showProfileSetup = userProfile === null && effectiveRole === AppRole.Admin;
  if (showProfileSetup) {
    console.log('[ProtectedLayout] Showing profile setup for admin');
    return (
      <AppShell>
        <ProfileSetupModal open={true} />
      </AppShell>
    );
  }

  // Show no-profile screen for non-admin users without profile
  if (userProfile === null && effectiveRole !== AppRole.Admin) {
    console.log('[ProtectedLayout] Non-admin user without profile');
    return <NoProfileBlockedScreen />;
  }

  // If we have identity and role is resolved but no effectiveRole, show error
  if (roleResolved && !effectiveRole) {
    console.error('[ProtectedLayout] Role resolved but no effectiveRole available');
    return (
      <BootstrapErrorScreen 
        error={new Error('Unable to determine user role. Please contact administrator.')} 
        onRetry={() => retryBootstrap()} 
      />
    );
  }

  console.log('[ProtectedLayout] All checks passed, rendering protected content with role:', effectiveRole);

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
