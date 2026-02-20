import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';
import type {
  PersistentOrder,
  MasterDesignEntry,
  SavedMasterDesignsRequest,
  HallmarkReturnRequest,
  PartialFulfillmentRequest,
  UserProfile,
  UserApprovalInfo,
  ApprovalStatus,
  ActivityLogEntry,
  UnmappedOrderEntry,
  BulkOrderUpdate,
  UpdateOrderTotalSuppliedRequest,
  BlockUserRequest,
  DesignImageMapping,
  PersistentKarigar,
} from '../backend';
import { Principal } from '@dfinity/principal';
import { useInternetIdentity } from './useInternetIdentity';

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

export function useListKarigars() {
  const { actor, isFetching } = useActor();

  return useQuery<PersistentKarigar[]>({
    queryKey: ['karigars'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listKarigars();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListKarigarReference() {
  const { actor, isFetching } = useActor();

  return useQuery<PersistentKarigar[]>({
    queryKey: ['karigarReference'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listKarigarReference();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadParsedOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parsedOrders: PersistentOrder[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.uploadParsedOrders(parsedOrders);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
    },
  });
}

export function useSaveMasterDesigns() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SavedMasterDesignsRequest) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveMasterDesigns(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
      queryClient.invalidateQueries({ queryKey: ['karigars'] });
      queryClient.invalidateQueries({ queryKey: ['karigarReference'] });
    },
  });
}

export function useUpdateOrdersForNewKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ designCode, newKarigarId }: { designCode: string; newKarigarId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOrdersForNewKarigar(designCode, newKarigarId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['masterDesigns'] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersForKarigar'] });
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

export function useMarkOrderAsDelivered() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderNo: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markOrderAsDelivered(orderNo);
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
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
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

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
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

export function useBlockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BlockUserRequest) => {
      if (!actor) throw new Error('Actor not available');
      return actor.blockUser(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
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
      queryClient.invalidateQueries({ queryKey: ['userProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
  });
}

export function useCheckUserBlocked() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isUserBlocked', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return false;
      return actor.isUserBlocked(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
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

export function useGetDesignImageForCode(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery<DesignImageMapping | null>({
    queryKey: ['designImage', designCode],
    queryFn: async () => {
      if (!actor) return null;
      const mappings = await actor.getDesignImageMappings();
      return mappings.find(m => m.designCode === designCode) || null;
    },
    enabled: !!actor && !isFetching && !!designCode,
  });
}

export function useCreateKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (karigar: Omit<PersistentKarigar, 'id'>) => {
      if (!actor) throw new Error('Actor not available');
      const id = karigar.name.trim().replace(/\s+/g, '_').toLowerCase();
      return actor.createKarigar({ ...karigar, id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['karigars'] });
      queryClient.invalidateQueries({ queryKey: ['karigarReference'] });
      toast.success('Karigar created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create karigar');
    },
  });
}
