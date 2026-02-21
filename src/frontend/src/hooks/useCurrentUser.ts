import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile } from '../backend';

/**
 * Fetches the current user's profile from the backend.
 * Returns null if no profile exists (first-time user).
 */
export function useCurrentUser() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      console.log('[useCurrentUser] Fetching user profile...');
      if (!actor) {
        console.error('[useCurrentUser] Actor not available');
        throw new Error('Actor not available');
      }
      
      try {
        const profile = await actor.getCallerUserProfile();
        console.log('[useCurrentUser] Profile fetched successfully:', profile);
        return profile;
      } catch (error: any) {
        console.error('[useCurrentUser] Failed to fetch profile:', error);
        
        // Don't retry on auth errors or timeouts
        const errorMessage = error?.message || String(error);
        const isAuthError = errorMessage.includes('Unauthorized') || 
                           errorMessage.includes('Anonymous') ||
                           errorMessage.includes('not authenticated');
        const isTimeoutError = errorMessage.includes('timeout') || 
                              errorMessage.includes('timed out');
        
        if (isAuthError || isTimeoutError) {
          console.log('[useCurrentUser] Auth/timeout error detected, not retrying');
          throw error;
        }
        
        throw error;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors or timeouts
      const errorMessage = error?.message || String(error);
      const isAuthError = errorMessage.includes('Unauthorized') || 
                         errorMessage.includes('Anonymous') ||
                         errorMessage.includes('not authenticated');
      const isTimeoutError = errorMessage.includes('timeout') || 
                            errorMessage.includes('timed out');
      
      if (isAuthError || isTimeoutError) {
        console.log('[useCurrentUser] Not retrying due to auth/timeout error');
        return false;
      }
      
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    userProfile: query.data,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
    isError: query.isError,
    error: query.error,
  };
}
