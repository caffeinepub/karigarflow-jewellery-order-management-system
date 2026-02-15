import { useInternetIdentity } from './useInternetIdentity';
import { useQuery } from '@tanstack/react-query';
import { type backendInterface } from '../backend';
import { createActorWithConfig } from '../config';
import { getSessionParameter } from '../utils/urlParams';

const SAFE_ACTOR_QUERY_KEY = 'safeActor';

export function useSafeActor() {
  const { identity } = useInternetIdentity();

  const actorQuery = useQuery<backendInterface>({
    queryKey: [SAFE_ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      console.log('[actor/create] Starting actor creation...');
      const isAuthenticated = !!identity;

      if (!isAuthenticated) {
        console.log('[actor/create] Creating anonymous actor');
        return await createActorWithConfig();
      }

      const actorOptions = {
        agentOptions: {
          identity
        }
      };

      console.log('[actor/create] Creating authenticated actor');
      const actor = await createActorWithConfig(actorOptions);

      // Safe initialization: non-blocking access control setup
      const adminToken = getSessionParameter('caffeineAdminToken');
      
      if (!adminToken || adminToken.trim() === '') {
        console.log('[accessControl/init] No token present, skipping initialization');
      } else {
        console.log('[accessControl/init] Token present, attempting initialization');
        try {
          await actor._initializeAccessControlWithSecret(adminToken);
          console.log('[accessControl/init] Initialization succeeded');
        } catch (error) {
          // Log error without leaking token
          console.error('[accessControl/init] Initialization failed:', error instanceof Error ? error.message : 'Unknown error');
          // Still return the actor so downstream queries can run
          // They will fail with proper authorization errors if needed
        }
      }

      console.log('[actor/create] Actor creation completed successfully');
      return actor;
    },
    staleTime: Infinity,
    gcTime: Infinity, // Keep actor in cache
    enabled: true,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('permission')) {
        console.log('[actor/create] Auth error detected, not retrying');
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
    isError: actorQuery.isError,
    error: actorQuery.error,
    refetch: actorQuery.refetch,
  };
}
