import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { PersistentOrder, MasterDesignEntry, UnmappedOrderEntry, UserProfile, AppRole, UserApprovalInfo, ApprovalStatus, BulkOrderUpdate, PartialFulfillmentRequest, ActivityLogEntry, BlockUserRequest, UpdateOrderTotalSuppliedRequest, DesignImageMapping } from '../backend';
import { ExternalBlob } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';
import { chunkOrders } from '@/lib/orders/chunkOrders';
import { getDB } from '@/offline/db';
import { normalizeDesignCode } from '@/lib/mapping/normalizeDesignCode';
import { sanitizeOrders } from '@/lib/orders/validatePersistentOrder';

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
      const rawOrders = await actor.getOrders();
      
      // Sanitize orders before persisting
      const { validOrders, skippedCount } = sanitizeOrders(rawOrders);
      
      if (skippedCount > 0) {
        console.warn(`Backend returned ${skippedCount} invalid orders, skipping them`);
      }
      
      // Persist only valid orders to IndexedDB after successful fetch
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
        
        // Add new valid orders
        for (const order of validOrders) {
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add(order);
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
          });
        }
      } catch (error) {
        console.warn('Failed to persist orders to IndexedDB:', error);
      }
      
      return validOrders;
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

export function useGetActiveOrdersForKarigar() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<PersistentOrder[]>({
    queryKey: ['activeKarigarOrders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const rawOrders = await actor.getActiveOrdersForKarigar();
      
      // Sanitize orders
      const { validOrders, skippedCount } = sanitizeOrders(rawOrders);
      
      if (skippedCount > 0) {
        console.warn(`Backend returned ${skippedCount} invalid karigar orders, skipping them`);
      }
      
      return validOrders;
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
      const totalBatches = batches.length;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await actor.uploadParsedOrders(batch);

        if (onProgress) {
          onProgress({
            currentBatch: i + 1,
            totalBatches,
            uploadedOrders: (i + 1) * BATCH_SIZE,
            totalOrders: orders.length,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
      queryClient.invalidateQueries({ queryKey: ['activeKarigarOrders'] });
    },
  });
}

export function useBulkUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, BulkOrderUpdate>({
    mutationFn: async (bulkUpdate) => {
      if (!actor) throw new Error('Actor not available');
      await actor.bulkUpdateOrderStatus(bulkUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeKarigarOrders'] });
      queryClient.invalidateQueries({ queryKey: ['activityLog'] });
    },
  });
}

export function useProcessPartialFulfillment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, PartialFulfillmentRequest>({
    mutationFn: async (request) => {
      if (!actor) throw new Error('Actor not available');
      await actor.processPartialFulfillment(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeKarigarOrders'] });
      queryClient.invalidateQueries({ queryKey: ['activityLog'] });
    },
  });
}

export function useUpdateOrderTotalSupplied() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateOrderTotalSuppliedRequest>({
    mutationFn: async (request) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateOrderTotalSupplied(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeKarigarOrders'] });
      queryClient.invalidateQueries({ queryKey: ['activityLog'] });
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
      const designs = await actor.getMasterDesigns();
      
      // Persist to IndexedDB
      try {
        const db = await getDB();
        const transaction = db.transaction(['masterDesigns'], 'readwrite');
        const store = transaction.objectStore('masterDesigns');
        
        await new Promise<void>((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(clearRequest.error);
        });
        
        for (const [code, entry] of designs) {
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add({ designCode: code, ...entry });
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
          });
        }
      } catch (error) {
        console.warn('Failed to persist master designs to IndexedDB:', error);
      }
      
      return designs;
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

export function useSaveMasterDesigns() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, [string, MasterDesignEntry][]>({
    mutationFn: async (designs) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveMasterDesigns(designs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
      queryClient.invalidateQueries({ queryKey: ['activeKarigarOrders'] });
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

export function useListUserProfiles() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile[]>({
    queryKey: ['userProfiles'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listUserProfiles();
    },
    enabled: !!actor && !actorFetching,
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
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

// ============================================================================
// Authorization
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
    staleTime: Infinity,
    retry: false,
  });
}

// ============================================================================
// User Approval
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

// ============================================================================
// Activity Log
// ============================================================================

export function useGetActivityLog() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ActivityLogEntry[]>({
    queryKey: ['activityLog'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getActivityLog();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

// ============================================================================
// User Blocking
// ============================================================================

export function useCheckUserBlocked() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isBlocked', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return false;
      return actor.isUserBlocked(identity.getPrincipal());
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 30_000,
  });
}

export function useBlockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, BlockUserRequest>({
    mutationFn: async (request) => {
      if (!actor) throw new Error('Actor not available');
      await actor.blockUser(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isBlocked'] });
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, Principal>({
    mutationFn: async (user) => {
      if (!actor) throw new Error('Actor not available');
      await actor.unblockUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isBlocked'] });
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
    },
  });
}

// ============================================================================
// Design Image Mappings
// ============================================================================

export function useGetDesignImageMappings() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DesignImageMapping[]>({
    queryKey: ['designImageMappings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getDesignImageMappings();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

export function useGetDesignImageForCode(designCode: string, enabled: boolean = true) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DesignImageMapping | null>({
    queryKey: ['designImageMapping', designCode],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const mappings = await actor.getDesignImageMappings();
      const normalized = normalizeDesignCode(designCode);
      return mappings.find(m => normalizeDesignCode(m.designCode) === normalized) || null;
    },
    enabled: !!actor && !actorFetching && enabled && !!designCode,
    staleTime: 60_000,
  });
}

export function useGetAdminDesignImageMappings() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<[DesignImageMapping, ExternalBlob][]>({
    queryKey: ['adminDesignImageMappings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAdminDesignImageMappings();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

export function useSaveDesignImageMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<DesignImageMapping[], Error, DesignImageMapping[]>({
    mutationFn: async (mappings) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveDesignImageMappings(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designImageMappings'] });
      queryClient.invalidateQueries({ queryKey: ['adminDesignImageMappings'] });
      queryClient.invalidateQueries({ queryKey: ['designImageMapping'] });
    },
  });
}
