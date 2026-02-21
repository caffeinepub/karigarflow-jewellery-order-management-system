import { useMemo } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useIsCallerAdmin } from './useQueries';
import { AppRole } from '../backend';

/**
 * Derives the effective app role by combining user profile role with backend admin detection.
 * This ensures Admin principals are always treated as Admin, even if their profile is stale.
 */
export function useEffectiveAppRole() {
  const { userProfile, isLoading: profileLoading, isFetched: profileFetched, isError: profileError } = useCurrentUser();
  const { data: isAdmin, isLoading: adminCheckLoading, isFetched: adminCheckFetched, isError: adminCheckError } = useIsCallerAdmin();

  // Role is resolved when both profile and admin check have completed (success or failure)
  const isResolved = profileFetched && adminCheckFetched;
  
  // Still loading if either is actively loading
  const isLoading = profileLoading || adminCheckLoading;

  // Track if there was an error that prevents role determination
  const hasError = profileError && adminCheckError;

  const effectiveRole = useMemo(() => {
    // Wait for both to be resolved
    if (!isResolved) {
      console.log('[effectiveRole] Not resolved yet - profileFetched:', profileFetched, 'adminCheckFetched:', adminCheckFetched);
      return null;
    }

    // If both checks failed, we can't determine role
    if (hasError) {
      console.error('[effectiveRole] Both profile and admin check failed - cannot determine role');
      return null;
    }

    // If backend says admin, always use Admin role
    if (isAdmin === true) {
      console.log('[effectiveRole] User is admin (backend check)');
      return AppRole.Admin;
    }

    // Otherwise use profile role if available
    if (userProfile) {
      console.log('[effectiveRole] Using profile role:', userProfile.appRole);
      return userProfile.appRole;
    }

    // No profile and not admin = no role
    console.log('[effectiveRole] No role available - isAdmin:', isAdmin, 'userProfile:', userProfile);
    return null;
  }, [isResolved, isAdmin, userProfile, hasError, profileFetched, adminCheckFetched]);

  return {
    effectiveRole,
    isResolved,
    isLoading,
    hasError,
  };
}
