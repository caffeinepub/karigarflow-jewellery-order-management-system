import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { 
  PersistentOrder, 
  MasterDesignEntry, 
  UnmappedOrderEntry, 
  UserProfile, 
  ActivityLogEntry,
  UserApprovalInfo,
  ApprovalStatus,
  PartialFulfillmentRequest,
  HallmarkReturnRequest,
  UpdateOrderTotalSuppliedRequest,
  DesignImageMapping,
  BulkOrderUpdate,
  PersistentKarigar,
} from '../backend';
import { Principal } from '@dfinity/principal';

export function useGetOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<PersistentOrder[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetActiveOrdersForKarigar() {
  const { actor, isFetching } = useActor();

  return useQuery<PersistentOrder[]>({
    queryKey: ['activeOrdersForKarigar'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveOrdersForKarigar();
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

export function useGetMasterDesigns() {
  const { actor, isFetching } = useActor();

  return useQuery<[string, MasterDesignEntry][]>({
    queryKey: ['masterDesigns'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesigns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadParsedOrdersBatched() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { orders: PersistentOrder[]; onProgress?: (progress: number) => void }) => {
      if (!actor) throw new Error('Actor not available');
      const { orders, onProgress } = variables;
      
      const BATCH_SIZE = 50;
      const batches: PersistentOrder[][] = [];
      for (let i = 0; i < orders.length; i += BATCH_SIZE) {
        batches.push(orders.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i++) {
        await actor.uploadParsedOrders(batches[i]);
        if (onProgress) {
          onProgress(((i + 1) / batches.length) * 100);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
    },
  });
}

export function useSaveMasterDesigns() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (masterDesigns: [string, MasterDesignEntry][]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveMasterDesigns(masterDesigns);
    },
    onSuccess: () => {
      // Invalidate and refetch all related queries immediately
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
      queryClient.invalidateQueries({ queryKey: ['karigars'] });
      
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ queryKey: ['orders'] });
      queryClient.refetchQueries({ queryKey: ['activeOrdersForKarigar'] });
      queryClient.refetchQueries({ queryKey: ['karigars'] });
    },
  });
}

export function useUpdateOrdersForNewKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ designCode, newKarigarName }: { designCode: string; newKarigarName: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOrdersForNewKarigar(designCode, newKarigarName);
    },
    onSuccess: () => {
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
      queryClient.invalidateQueries({ queryKey: ['karigars'] });
      
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ queryKey: ['orders'] });
      queryClient.refetchQueries({ queryKey: ['activeOrdersForKarigar'] });
    },
  });
}

export function useSetActiveFlagForMasterDesign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ designCode, isActive }: { designCode: string; isActive: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setActiveFlagForMasterDesign(designCode, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
    },
  });
}

export function useGetActivityLog() {
  const { actor, isFetching } = useActor();

  return useQuery<ActivityLogEntry[]>({
    queryKey: ['activityLog'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivityLog();
    },
    enabled: !!actor && !isFetching,
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

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
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
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: ApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

export function useCreateUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, profile }: { user: Principal; profile: UserProfile }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createUserProfile(user, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCheckUserBlocked() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isUserBlocked'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isUserBlocked(await actor.getCallerUserProfile().then(p => p ? Principal.fromText('2vxsx-fae') : Principal.fromText('2vxsx-fae')));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBlockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, reason }: { user: Principal; reason?: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.blockUser({ user, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unblockUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
    },
  });
}

export function useListUserProfiles() {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile[]>({
    queryKey: ['userProfiles'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listUserProfiles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useProcessPartialFulfillment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: PartialFulfillmentRequest) => {
      if (!actor) throw new Error('Actor not available');
      return actor.processPartialFulfillment(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
    },
  });
}

export function useHandleHallmarkReturns() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: HallmarkReturnRequest) => {
      if (!actor) throw new Error('Actor not available');
      return actor.handleHallmarkReturns(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
    },
  });
}

export function useBulkUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bulkUpdate: BulkOrderUpdate) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bulkUpdateOrderStatus(bulkUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
    },
  });
}

export function useBulkMarkOrdersAsDelivered() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderNos: string[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bulkMarkOrdersAsDelivered(orderNos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
    },
  });
}

export function useUpdateOrderTotalSupplied() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateOrderTotalSuppliedRequest) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOrderTotalSupplied(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
    },
  });
}

export function useGetDesignImageMappings() {
  const { actor, isFetching } = useActor();

  return useQuery<DesignImageMapping[]>({
    queryKey: ['designImageMappings'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDesignImageMappings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveDesignImageMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parsedMappings: DesignImageMapping[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveDesignImageMappings(parsedMappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designImageMappings'] });
    },
  });
}

export function useGetDesignImageForCode(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['designImage', designCode],
    queryFn: async () => {
      if (!actor) return null;
      const mappings = await actor.getDesignImageMappings();
      const mapping = mappings.find(m => m.designCode === designCode);
      return mapping || null;
    },
    enabled: !!actor && !isFetching && !!designCode,
  });
}

// Helper function to normalize karigar names for comparison
function normalizeKarigarName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Karigar management hooks
export function useListKarigars() {
  const { actor, isFetching } = useActor();

  return useQuery<PersistentKarigar[]>({
    queryKey: ['karigars'],
    queryFn: async () => {
      if (!actor) return [];
      
      // Fetch both PersistentKarigar objects and karigar names from existing data
      const [karigarObjects, karigarNames] = await Promise.all([
        actor.listKarigars(),
        actor.listKarigarsNames(),
      ]);

      // Create a map to deduplicate and merge (use normalized keys for comparison)
      const karigarMap = new Map<string, PersistentKarigar>();

      // First, add all PersistentKarigar objects from karigarStorage
      for (const karigar of karigarObjects) {
        const normalizedKey = normalizeKarigarName(karigar.name);
        karigarMap.set(normalizedKey, karigar);
      }

      // Then, add any names from existing data that aren't already in the map
      // These are treated as active karigars since they're in use
      for (const name of karigarNames) {
        const trimmedName = name.trim();
        // Skip empty or whitespace-only names
        if (!trimmedName) continue;
        
        const normalizedKey = normalizeKarigarName(trimmedName);
        if (!karigarMap.has(normalizedKey)) {
          karigarMap.set(normalizedKey, { name: trimmedName, isActive: true });
        }
      }

      // Convert map to array and sort alphabetically
      return Array.from(karigarMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    },
    enabled: !!actor && !isFetching,
    staleTime: 0, // Always fetch fresh data - karigars can be added frequently
    retry: 2, // Retry failed requests twice
  });
}

export function useCreateKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (karigar: PersistentKarigar) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createKarigar(karigar);
    },
    onSuccess: () => {
      // Invalidate and immediately refetch to ensure dropdown updates
      queryClient.invalidateQueries({ queryKey: ['karigars'] });
      queryClient.refetchQueries({ queryKey: ['karigars'] });
    },
  });
}
