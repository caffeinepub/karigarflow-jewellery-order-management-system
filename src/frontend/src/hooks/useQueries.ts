import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeActor } from './useSafeActor';
import type { Order, MasterDesignEntry, DesignCode, UnmappedOrderEntry, UserProfile } from '../backend';
import { Principal } from '@dfinity/principal';
import { classifyBootstrapError, getSafeErrorString } from '@/utils/bootstrapErrorClassification';

export function useGetOrders() {
  const { actor, isFetching, isError: actorError, error: actorErrorObj } = useSafeActor();

  const query = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getOrders();
    },
    enabled: !!actor && !isFetching && !actorError,
  });

  // Surface actor errors
  if (actorError) {
    return {
      ...query,
      data: [],
      isError: true,
      error: actorErrorObj,
    };
  }

  return query;
}

export function useUploadParsedOrders() {
  const { actor } = useSafeActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parsedOrders: Order[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.uploadParsedOrders(parsedOrders);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
    },
  });
}

export function useGetMasterDesigns() {
  const { actor, isFetching, isError: actorError, error: actorErrorObj } = useSafeActor();

  const query = useQuery<[DesignCode, MasterDesignEntry][]>({
    queryKey: ['masterDesigns'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMasterDesigns();
    },
    enabled: !!actor && !isFetching && !actorError,
  });

  // Surface actor errors
  if (actorError) {
    return {
      ...query,
      data: [],
      isError: true,
      error: actorErrorObj,
    };
  }

  return query;
}

export function useSaveMasterDesigns() {
  const { actor } = useSafeActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (masterDesigns: [DesignCode, MasterDesignEntry][]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveMasterDesigns(masterDesigns);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
    },
  });
}

export function useSetActiveFlagForMasterDesign() {
  const { actor } = useSafeActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ designCode, isActive }: { designCode: DesignCode; isActive: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setActiveFlagForMasterDesign(designCode, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
    },
  });
}

export function useGetUnmappedDesignCodes() {
  const { actor, isFetching, isError: actorError, error: actorErrorObj } = useSafeActor();

  const query = useQuery<UnmappedOrderEntry[]>({
    queryKey: ['unmappedDesignCodes'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getUnmappedDesignCodes();
    },
    enabled: !!actor && !isFetching && !actorError,
  });

  // Surface actor errors
  if (actorError) {
    return {
      ...query,
      data: [],
      isError: true,
      error: actorErrorObj,
    };
  }

  return query;
}

export function useDeleteOrder() {
  const { actor } = useSafeActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderNo: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteOrder(orderNo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching, isError: actorError, error: actorErrorObj } = useSafeActor();

  const query = useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      console.log('[admin/check] Checking admin status...');
      try {
        const isAdmin = await actor.isCallerAdmin();
        console.log('[admin/check] Admin check succeeded:', isAdmin);
        return isAdmin;
      } catch (error) {
        const errorMsg = getSafeErrorString(error);
        const classification = classifyBootstrapError(error);
        
        // Log with classification tag if available
        if (classification.diagnosticTag) {
          console.error(classification.diagnosticTag, errorMsg);
        } else {
          console.error('[admin/check] Admin check failed:', errorMsg);
        }
        
        // Check if it's an authorization error
        if (errorMsg.includes('Unauthorized') || errorMsg.includes('permission')) {
          console.error('[admin/check] Authorization/permission failure detected');
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !actorError,
    retry: (failureCount, error) => {
      // Don't retry on auth errors during bootstrap
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
      data: false,
      isLoading: false,
      isError: true,
      error: actorErrorObj,
      refetch: query.refetch,
    };
  }

  return query;
}

export function useCreateUserProfile() {
  const { actor } = useSafeActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, profile }: { user: Principal; profile: UserProfile }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createUserProfile(user, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
    },
  });
}

export function useGetUserProfile() {
  const { actor } = useSafeActor();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.getUserProfile(user);
    },
  });
}
