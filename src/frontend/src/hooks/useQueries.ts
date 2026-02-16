import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useSafeActor } from './useSafeActor';
import { Principal } from '@dfinity/principal';
import type { Order, MasterDesignEntry, UnmappedOrderEntry, UserProfile, UserApprovalInfo, ApprovalStatus, UserRole } from '../backend';
import { chunkOrders } from '../lib/orders/chunkOrders';

const BATCH_SIZE = 50;

export interface BatchUploadProgress {
  currentBatch: number;
  totalBatches: number;
  uploadedOrders: number;
  totalOrders: number;
}

export function useGetOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMasterDesigns() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, MasterDesignEntry]>>({
    queryKey: ['masterDesigns'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesigns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUnmappedDesignCodes() {
  const { actor, isFetching } = useActor();

  return useQuery<UnmappedOrderEntry[]>({
    queryKey: ['unmappedDesignCodes'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUnmappedDesignCodes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadParsedOrdersBatched() {
  const queryClient = useQueryClient();
  const { actor } = useActor();

  return useMutation<
    void,
    Error,
    { orders: Order[]; onProgress?: (progress: BatchUploadProgress) => void }
  >({
    mutationFn: async ({ orders, onProgress }) => {
      if (!actor) throw new Error('Actor not available');

      const batches = chunkOrders(orders, BATCH_SIZE);
      const totalBatches = batches.length;
      let uploadedOrders = 0;
      const failedBatches: Array<{ batchIndex: number; orders: Order[]; error: string }> = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Report progress
        if (onProgress) {
          onProgress({
            currentBatch: i + 1,
            totalBatches,
            uploadedOrders,
            totalOrders: orders.length,
          });
        }

        try {
          await actor.uploadParsedOrders(batch);
          uploadedOrders += batch.length;
        } catch (error) {
          console.error(`Batch ${i + 1} failed:`, error);
          failedBatches.push({
            batchIndex: i,
            orders: batch,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Report final progress
      if (onProgress) {
        onProgress({
          currentBatch: totalBatches,
          totalBatches,
          uploadedOrders,
          totalOrders: orders.length,
        });
      }

      // If any batches failed, throw error with details
      if (failedBatches.length > 0) {
        const error: any = new Error(
          `${failedBatches.length} of ${totalBatches} batches failed to upload`
        );
        error.failedBatches = failedBatches;
        throw error;
      }
    },
    onSuccess: async () => {
      // Refetch (not just invalidate) to ensure dashboards show new data immediately
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['orders'] }),
        queryClient.refetchQueries({ queryKey: ['unmappedDesignCodes'] }),
      ]);
    },
  });
}

export function useSaveMasterDesigns() {
  const queryClient = useQueryClient();
  const { actor } = useActor();

  return useMutation<void, Error, Array<[string, MasterDesignEntry]>>({
    mutationFn: async (masterDesigns) => {
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
  const queryClient = useQueryClient();
  const { actor } = useActor();

  return useMutation<void, Error, { designCode: string; isActive: boolean }>({
    mutationFn: async ({ designCode, isActive }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setActiveFlagForMasterDesign(designCode, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
    },
  });
}

export function useSaveCallerUserProfile() {
  const queryClient = useQueryClient();
  const { actor } = useActor();

  return useMutation<void, Error, UserProfile>({
    mutationFn: async (profile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useCreateUserProfile() {
  const queryClient = useQueryClient();
  const { actor } = useActor();

  return useMutation<void, Error, { user: Principal; profile: UserProfile }>({
    mutationFn: async ({ user, profile }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createUserProfile(user, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

/**
 * Bootstrap-safe admin check using useSafeActor.
 * Returns false when actor is unavailable instead of blocking indefinitely.
 */
export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching, isError: actorError } = useSafeActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) {
        console.log('[admin-check] Actor not available, returning false');
        return false;
      }
      console.log('[admin-check] Checking admin status...');
      try {
        const result = await actor.isCallerAdmin();
        console.log('[admin-check] Admin check result:', result);
        return result;
      } catch (error) {
        console.error('[admin-check] Admin check failed:', error);
        // On error, assume not admin
        return false;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false, // Don't retry admin checks
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Ensure query reaches isFetched even when disabled
    placeholderData: false,
  });
}

export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerApproved();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListApprovals() {
  const { actor, isFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetApproval() {
  const queryClient = useQueryClient();
  const { actor } = useActor();

  return useMutation<void, Error, { user: Principal; status: ApprovalStatus }>({
    mutationFn: async ({ user, status }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

export function useRequestApproval() {
  const queryClient = useQueryClient();
  const { actor } = useActor();

  return useMutation<void, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}
