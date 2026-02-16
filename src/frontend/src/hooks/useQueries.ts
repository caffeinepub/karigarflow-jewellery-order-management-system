import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { PersistentOrder, MasterDesignEntry, UnmappedOrderEntry, UserProfile, AppRole, UserApprovalInfo, ApprovalStatus, BulkOrderUpdate } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';
import { chunkOrders } from '@/lib/orders/chunkOrders';
import { getDB } from '@/offline/db';

// Re-export PersistentOrder as Order for convenience
export type Order = PersistentOrder;

// Local type for user profile info (backend doesn't export this yet)
export interface UserProfileInfo {
  principal: Principal;
  profile: UserProfile;
}

// ============================================================================
// Orders
// ============================================================================

export function useGetOrders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<PersistentOrder[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const orders = await actor.getOrders();
      
      // Persist to IndexedDB after successful fetch
      try {
        const db = await getDB();
        const transaction = db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        
        // Clear existing orders
        await new Promise<void>((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(clearRequest.error);
        });
        
        // Add new orders
        for (const order of orders) {
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add(order);
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
          });
        }
      } catch (error) {
        console.warn('Failed to persist orders to IndexedDB:', error);
      }
      
      return orders;
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

export interface BatchUploadProgress {
  currentBatch: number;
  totalBatches: number;
  uploadedOrders: number;
  totalOrders: number;
}

export function useUploadParsedOrdersBatched() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { orders: PersistentOrder[]; onProgress?: (progress: BatchUploadProgress) => void }
  >({
    mutationFn: async ({ orders, onProgress }) => {
      if (!actor) throw new Error('Actor not available');

      const BATCH_SIZE = 50;
      const batches = chunkOrders(orders, BATCH_SIZE);
      const failedBatches: Array<{ batchIndex: number; orders: PersistentOrder[]; error: string }> = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        if (onProgress) {
          onProgress({
            currentBatch: i + 1,
            totalBatches: batches.length,
            uploadedOrders: i * BATCH_SIZE,
            totalOrders: orders.length,
          });
        }

        try {
          await actor.uploadParsedOrders(batch);
        } catch (error) {
          console.error(`Batch ${i + 1} failed:`, error);
          failedBatches.push({
            batchIndex: i,
            orders: batch,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      if (onProgress) {
        onProgress({
          currentBatch: batches.length,
          totalBatches: batches.length,
          uploadedOrders: orders.length,
          totalOrders: orders.length,
        });
      }

      if (failedBatches.length > 0) {
        const error = new Error(`${failedBatches.length} batch(es) failed to upload`);
        (error as any).failedBatches = failedBatches;
        throw error;
      }
    },
    onSuccess: async () => {
      // Invalidate both orders and unmapped queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] }),
      ]);
      
      // Force refetch to ensure cache is updated immediately
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['orders'] }),
        queryClient.refetchQueries({ queryKey: ['unmappedDesignCodes'] }),
      ]);
    },
  });
}

export function useBulkUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { orderNos: string[]; newStatus: string }>({
    mutationFn: async ({ orderNos, newStatus }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Create the BulkOrderUpdate object as expected by the backend
      const bulkUpdate: BulkOrderUpdate = {
        orderNos,
        newStatus,
      };
      
      await actor.bulkUpdateOrderStatus(bulkUpdate);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.refetchQueries({ queryKey: ['orders'] });
    },
  });
}

// ============================================================================
// Master Designs
// ============================================================================

export function useGetMasterDesigns() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<[string, MasterDesignEntry][]>({
    queryKey: ['masterDesigns'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMasterDesigns();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

export function useSaveMasterDesigns() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, [string, MasterDesignEntry][]>({
    mutationFn: async (masterDesigns) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveMasterDesigns(masterDesigns);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
    },
  });
}

export function useSetActiveFlagForMasterDesign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { designCode: string; isActive: boolean }>({
    mutationFn: async ({ designCode, isActive }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setActiveFlagForMasterDesign(designCode, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
    },
  });
}

// ============================================================================
// Unmapped Design Codes
// ============================================================================

export function useGetUnmappedDesignCodes() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UnmappedOrderEntry[]>({
    queryKey: ['unmappedDesignCodes'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getUnmappedDesignCodes();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

// ============================================================================
// User Profiles
// ============================================================================

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UserProfile>({
    mutationFn: async (profile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useCreateUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { user: Principal; profile: UserProfile }>({
    mutationFn: async ({ user, profile }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.createUserProfile(user, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
    },
  });
}

export function useListUserProfiles() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfileInfo[]>({
    queryKey: ['userProfiles'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // Check if the method exists on the actor
      if (typeof (actor as any).listUserProfiles !== 'function') {
        console.warn('Backend does not support listUserProfiles yet');
        return [];
      }
      return (actor as any).listUserProfiles();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

// ============================================================================
// Admin Check
// ============================================================================

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

// ============================================================================
// Approval System
// ============================================================================

export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isApproved'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerApproved();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isApproved'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { user: Principal; status: ApprovalStatus }>({
    mutationFn: async ({ user, status }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
