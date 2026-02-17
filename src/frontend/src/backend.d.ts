import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface DesignImageMapping {
    createdAt: Time;
    createdBy: Principal;
    genericName: string;
    image: ExternalBlob;
    designCode: string;
}
export interface BulkOrderUpdate {
    isReturnedFromDelivered?: boolean;
    orderNos: Array<string>;
    newStatus: string;
}
export type Time = bigint;
export interface HealthCheckResponse {
    status: string;
    canisterId: string;
}
export interface Karigar {
    name: string;
    isActive: boolean;
}
export interface HallmarkReturnRequest {
    actionType: Variant_update_status_return_hallmark;
    orderNos: Array<string>;
}
export interface UnmappedOrderEntry {
    qty: bigint;
    weight?: number;
    createdAt: Time;
    size?: number;
    orderType: string;
    orderNo: string;
    isCustomerOrder: boolean;
    designCode: string;
    uploadDate: Time;
    remarks: string;
}
export interface PersistentKarigar {
    name: string;
    isActive: boolean;
}
export interface ActivityLogEntry {
    action: string;
    userId: Principal;
    timestamp: Time;
    details: string;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface BlockUserRequest {
    user: Principal;
    reason?: string;
}
export interface PersistentOrder {
    qty: bigint;
    weight?: number;
    status: string;
    createdAt: Time;
    size?: number;
    orderType: string;
    isReturnedFromDelivered: boolean;
    orderNo: string;
    isCustomerOrder: boolean;
    karigarName: string;
    genericName: string;
    designCode: string;
    uploadDate: Time;
    remarks: string;
}
export interface UpdateOrderTotalSuppliedRequest {
    orderNo: string;
    newTotalSupplied: bigint;
}
export interface PartialFulfillmentRequest {
    entries: Array<PartialFulfillmentQty>;
}
export interface MasterDesignEntry {
    isActive: boolean;
    karigarName: string;
    genericName: string;
}
export interface PartialFulfillmentQty {
    suppliedQty: bigint;
    orderNo: string;
}
export interface UserProfile {
    isCreated: boolean;
    appRole: AppRole;
    name: string;
    karigarName?: string;
}
export enum AppRole {
    Staff = "Staff",
    Admin = "Admin",
    Karigar = "Karigar"
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_update_status_return_hallmark {
    update_status = "update_status",
    return_hallmark = "return_hallmark"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(request: BlockUserRequest): Promise<void>;
    bulkMarkOrdersAsDelivered(orderNos: Array<string>): Promise<void>;
    bulkUpdateOrderStatus(bulkUpdate: BulkOrderUpdate): Promise<void>;
    createKarigar(karigar: Karigar): Promise<void>;
    createUserProfile(user: Principal, profile: UserProfile): Promise<void>;
    deleteKarigarByName(karigarName: string): Promise<void>;
    getActiveOrdersForKarigar(): Promise<Array<PersistentOrder>>;
    getActivityLog(): Promise<Array<ActivityLogEntry>>;
    getAdminDesignImageMappings(): Promise<Array<[DesignImageMapping, ExternalBlob]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDesignImageMappings(): Promise<Array<DesignImageMapping>>;
    getMasterDesigns(): Promise<Array<[string, MasterDesignEntry]>>;
    getOrders(): Promise<Array<PersistentOrder>>;
    getUnmappedDesignCodes(): Promise<Array<UnmappedOrderEntry>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    handleHallmarkReturns(request: HallmarkReturnRequest): Promise<void>;
    healthCheck(): Promise<HealthCheckResponse>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isUserBlocked(user: Principal): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    listDistinctKarigars(): Promise<Array<PersistentKarigar>>;
    listKarigars(): Promise<Array<PersistentKarigar>>;
    listKarigarsNames(): Promise<Array<string>>;
    listUserProfiles(): Promise<Array<UserProfile>>;
    markOrderAsDelivered(orderNo: string): Promise<void>;
    processPartialFulfillment(request: PartialFulfillmentRequest): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveDesignImageMappings(parsedMappings: Array<DesignImageMapping>): Promise<Array<DesignImageMapping>>;
    saveMasterDesigns(masterDesigns: Array<[string, MasterDesignEntry]>): Promise<void>;
    setActiveFlagForMasterDesign(designCode: string, isActive: boolean): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    unblockUser(user: Principal): Promise<void>;
    updateOrderTotalSupplied(request: UpdateOrderTotalSuppliedRequest): Promise<void>;
    updateOrdersForNewKarigar(designCode: string, newKarigarName: string): Promise<void>;
    uploadParsedOrders(parsedOrders: Array<PersistentOrder>): Promise<void>;
}
