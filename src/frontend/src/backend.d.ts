import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export type Time = bigint;
export interface PersistentOrder {
    qty: bigint;
    weight: number;
    status: string;
    createdAt: Time;
    size: number;
    orderType: string;
    orderNo: string;
    isCustomerOrder: boolean;
    karigarName: string;
    genericName: string;
    designCode: string;
    uploadDate: Time;
    remarks: string;
}
export interface HealthCheckResponse {
    status: string;
    canisterId: string;
}
export interface BulkOrderUpdate {
    orderNos: Array<string>;
    newStatus: string;
}
export interface MasterDesignEntry {
    isActive: boolean;
    karigarName: string;
    genericName: string;
}
export interface UserProfile {
    appRole: AppRole;
    name: string;
    karigarName?: string;
}
export interface UnmappedOrderEntry {
    qty: bigint;
    weight: number;
    createdAt: Time;
    size: number;
    orderType: string;
    orderNo: string;
    isCustomerOrder: boolean;
    designCode: string;
    uploadDate: Time;
    remarks: string;
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
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bulkUpdateOrderStatus(bulkUpdate: BulkOrderUpdate): Promise<void>;
    createUserProfile(user: Principal, profile: UserProfile): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMasterDesigns(): Promise<Array<[string, MasterDesignEntry]>>;
    getOrders(): Promise<Array<PersistentOrder>>;
    getUnmappedDesignCodes(): Promise<Array<UnmappedOrderEntry>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    healthCheck(): Promise<HealthCheckResponse>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveMasterDesigns(masterDesigns: Array<[string, MasterDesignEntry]>): Promise<void>;
    setActiveFlagForMasterDesign(designCode: string, isActive: boolean): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    uploadParsedOrders(parsedOrders: Array<PersistentOrder>): Promise<void>;
}
