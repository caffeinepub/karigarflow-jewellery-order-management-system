import { useQuery } from '@tanstack/react-query';
import { useSafeActor } from './useSafeActor';
import { classifyBootstrapError, getSafeErrorString } from '../utils/bootstrapErrorClassification';

export type BackendStatus = 'checking' | 'online' | 'offline';

export interface BackendReachabilityState {
  status: BackendStatus;
  error: unknown | null;
  refetch: () => void;
  isRefetching: boolean;
}

/**
 * Hook that periodically checks backend reachability via healthCheck.
 * Uses safe actor creation and classifies errors for stopped-canister detection.
 */
export function useBackendReachability(): BackendReachabilityState {
  const { actor } = useSafeActor();

  const healthQuery = useQuery({
    queryKey: ['backendHealth'],
    queryFn: async () => {
      if (!actor) {
        throw new Error('Actor not available');
      }
      
      console.log('[health] Checking backend reachability...');
      const response = await actor.healthCheck();
      console.log('[health] Backend is reachable:', response);
      return response;
    },
    enabled: !!actor,
    retry: false,
    refetchInterval: 30000, // Check every 30 seconds
    refetchIntervalInBackground: false,
  });

  // Classify errors for stopped-canister detection
  if (healthQuery.error) {
    const classification = classifyBootstrapError(healthQuery.error);
    const safeError = getSafeErrorString(healthQuery.error);
    
    if (classification.isStoppedCanister) {
      console.log('[health] Backend canister is stopped:', safeError);
    } else {
      console.log('[health] Backend health check failed:', safeError);
    }
  }

  // Determine status
  let status: BackendStatus = 'checking';
  
  if (healthQuery.isFetched) {
    status = healthQuery.isSuccess ? 'online' : 'offline';
  }

  return {
    status,
    error: healthQuery.error || null,
    refetch: healthQuery.refetch,
    isRefetching: healthQuery.isRefetching,
  };
}
