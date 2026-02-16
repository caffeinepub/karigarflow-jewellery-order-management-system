import { useInternetIdentity } from './useInternetIdentity';
import { useQuery } from '@tanstack/react-query';
import { type backendInterface } from '../backend';
import { createActorWithConfig } from '../config';
import { getSessionParameter } from '../utils/urlParams';
import { withTimeout } from '../utils/withTimeout';

const SAFE_ACTOR_QUERY_KEY = 'safeActor';

export function useSafeActor() {
  const { identity } = useInternetIdentity();

  const actorQuery = useQuery<backendInterface>({
    queryKey: [SAFE_ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      console.log('[safeActor] Starting actor creation...');
      
      // Wrap the entire actor creation in a 15-second timeout
      return withTimeout(
        (async () => {
          const isAuthenticated = !!identity;

          if (!isAuthenticated) {
            console.log('[safeActor] Creating anonymous actor');
            return await createActorWithConfig();
          }

          const actorOptions = {
            agentOptions: {
              identity
            }
          };

          console.log('[safeActor] Creating authenticated actor');
          const actor = await createActorWithConfig(actorOptions);

          // Safe initialization: non-blocking access control setup
          const adminToken = getSessionParameter('caffeineAdminToken');
          
          if (!adminToken || adminToken.trim() === '') {
            console.log('[safeActor] No token present, skipping initialization');
          } else {
            console.log('[safeActor] Token present, attempting initialization');
            try {
              await actor._initializeAccessControlWithSecret(adminToken);
              console.log('[safeActor] Initialization succeeded');
            } catch (error) {
              console.error('[safeActor] Initialization failed:', error instanceof Error ? error.message : 'Unknown error');
            }
          }

          console.log('[safeActor] Actor creation completed successfully');
          return actor;
        })(),
        15000,
        'Actor creation timed out after 15 seconds. The backend may be unreachable or not responding.'
      );
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: true,
    retry: (failureCount, error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('permission') || errorMsg.includes('timed out')) {
        console.log('[safeActor] Non-retryable error detected:', errorMsg);
        return false;
      }
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
