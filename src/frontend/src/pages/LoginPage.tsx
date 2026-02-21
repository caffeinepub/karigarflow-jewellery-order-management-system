import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useEffectiveAppRole } from '../hooks/useEffectiveAppRole';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useSafeActor } from '../hooks/useSafeActor';
import { LoginButton } from '../components/auth/LoginButton';
import { Gem, Loader2 } from 'lucide-react';
import { AppRole } from '../backend';

export function LoginPage() {
  const navigate = useNavigate();
  const { identity, isInitializing } = useInternetIdentity();
  const { effectiveRole, isResolved, isLoading: roleLoading } = useEffectiveAppRole();
  const { userProfile, isLoading: profileLoading, isFetched } = useCurrentUser();
  const { actor, isFetching: actorFetching } = useSafeActor();

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    console.log('[LoginPage] Auth state check:', {
      isInitializing,
      hasIdentity: !!identity,
      actorFetching,
      hasActor: !!actor,
      profileLoading,
      isFetched,
      roleLoading,
      isResolved,
      effectiveRole,
      hasProfile: !!userProfile,
    });

    // Wait for authentication initialization
    if (isInitializing) {
      console.log('[LoginPage] ⏳ Still initializing identity...');
      return;
    }

    // Not authenticated - stay on login page
    if (!identity) {
      console.log('[LoginPage] ℹ️ No identity, staying on login page');
      return;
    }

    // Wait for actor to be ready
    if (actorFetching || !actor) {
      console.log('[LoginPage] ⏳ Actor not ready yet...');
      return;
    }

    // Wait for profile to be fetched
    if (profileLoading || !isFetched) {
      console.log('[LoginPage] ⏳ Profile not fetched yet...');
      return;
    }

    // Wait for role to be resolved
    if (!isResolved || roleLoading) {
      console.log('[LoginPage] ⏳ Role not resolved yet...');
      return;
    }

    // If user has a role, redirect to appropriate dashboard
    if (effectiveRole) {
      console.log('[LoginPage] ✓ All checks passed, redirecting user with role:', effectiveRole);
      
      let targetPath = '/admin';
      if (effectiveRole === AppRole.Admin) {
        targetPath = '/admin';
      } else if (effectiveRole === AppRole.Staff) {
        targetPath = '/staff';
      } else if (effectiveRole === AppRole.Karigar) {
        targetPath = '/karigar';
      }

      console.log('[LoginPage] 🚀 Navigating to:', targetPath);
      navigate({ to: targetPath, replace: true });
    } else {
      console.log('[LoginPage] ⚠️ Identity exists, role resolved, but no effectiveRole available');
    }
  }, [identity, isInitializing, effectiveRole, isResolved, roleLoading, navigate, userProfile, profileLoading, isFetched, actor, actorFetching]);

  // Show loading state while checking authentication
  const isCheckingAuth = isInitializing || (identity && (!actor || actorFetching || !isFetched || !isResolved || roleLoading));
  
  if (isCheckingAuth) {
    console.log('[LoginPage] 🔄 Showing loading state');
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-border bg-card shadow-lg p-8">
            <div className="text-center space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  {isInitializing ? 'Initializing...' : 
                   actorFetching || !actor ? 'Connecting to backend...' :
                   profileLoading || !isFetched ? 'Loading your profile...' :
                   'Loading your dashboard...'}
                </p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Only render login UI if definitely not authenticated
  console.log('[LoginPage] 📝 Rendering login UI');
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-card shadow-lg p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Gem className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">KarigarFlow</h1>
            <p className="text-muted-foreground">
              Jewellery Order Management System
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Sign in to access your dashboard and manage orders
            </p>
            <div className="flex justify-center">
              <LoginButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
