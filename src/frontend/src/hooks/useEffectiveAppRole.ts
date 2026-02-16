import { useMemo } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useIsCallerAdmin } from './useQueries';
import { AppRole } from '../backend';

/**
 * Derives the effective app role by combining user profile role with backend admin detection.
 * This ensures Admin principals are always treated as Admin, even if their profile is stale.
 */
export function useEffectiveAppRole() {
  const { userProfile, isLoading: profileLoading, isFetched: profileFetched } = useCurrentUser();
  const { data: isAdmin, isLoading: adminCheckLoading, isFetched: adminCheckFetched } = useIsCallerAdmin();

  // Role is resolved when both profile and admin check have completed (or failed)
  const isResolved = profileFetched && adminCheckFetched;
  
  // Still loading if either is actively loading
  const isLoading = profileLoading || adminCheckLoading;

  const effectiveRole = useMemo(() => {
    // Wait for both to be resolved
    if (!isResolved) {
      return null;
    }

    // If backend says admin, always use Admin role
    if (isAdmin) {
      console.log('[effectiveRole] User is admin (backend check)');
      return AppRole.Admin;
    }

    // Otherwise use profile role
    if (userProfile) {
      console.log('[effectiveRole] Using profile role:', userProfile.appRole);
      return userProfile.appRole;
    }

    console.log('[effectiveRole] No role available');
    return null;
  }, [isAdmin, userProfile, isResolved]);

  return {
    effectiveRole,
    isLoading,
    isResolved,
  };
}
