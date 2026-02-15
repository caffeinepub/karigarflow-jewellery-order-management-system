import { useQuery } from '@tanstack/react-query';
import { useSafeActor } from './useSafeActor';
import type { UserProfile } from '../backend';
import { classifyBootstrapError, getSafeErrorString } from '@/utils/bootstrapErrorClassification';

export function useCurrentUser() {
  const { actor, isFetching: actorFetching, isError: actorError, error: actorErrorObj } = useSafeActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      console.log('[profile/fetch] Fetching user profile...');
      try {
        const profile = await actor.getCallerUserProfile();
        console.log('[profile/fetch] Profile fetch succeeded:', profile ? 'profile found' : 'no profile');
        return profile;
      } catch (error) {
        const errorMsg = getSafeErrorString(error);
        const classification = classifyBootstrapError(error);
        
        // Log with classification tag if available
        if (classification.diagnosticTag) {
          console.error(classification.diagnosticTag, errorMsg);
        } else {
          console.error('[profile/fetch] Profile fetch failed:', errorMsg);
        }
        
        // Check if it's an authorization error
        if (errorMsg.includes('Unauthorized') || errorMsg.includes('permission')) {
          console.error('[profile/fetch] Authorization/permission failure detected');
        }
        throw error;
      }
    },
    enabled: !!actor && !actorFetching && !actorError,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('permission')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetch on navigation
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  });

  // If actor creation failed, surface that error
  if (actorError) {
    return {
      ...query,
      userProfile: null,
      isLoading: false,
      isFetched: true,
      isError: true,
      error: actorErrorObj,
    };
  }

  return {
    ...query,
    userProfile: query.data,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}
