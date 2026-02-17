import Map "mo:core/Map";
import List "mo:core/List";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import BlobStorage "blob-storage/Storage";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  type PartialFulfillmentQty = {
    orderNo : Text;
    suppliedQty : Nat;
  };

  type PersistentOrder = {
    orderNo : Text;
    orderType : Text;
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    weight : ?Float;
    size : ?Float;
    qty : Nat;
    remarks : Text;
    status : Text;
    isCustomerOrder : Bool;
    uploadDate : Time.Time;
    createdAt : Time.Time;
    isReturnedFromDelivered : Bool;
  };

  type MasterDesignEntry = {
    genericName : Text;
    karigarName : Text;
    isActive : Bool;
  };

  type UnmappedOrderEntry = {
    orderNo : Text;
    orderType : Text;
    designCode : Text;
    weight : ?Float;
    size : ?Float;
    qty : Nat;
    remarks : Text;
    isCustomerOrder : Bool;
    uploadDate : Time.Time;
    createdAt : Time.Time;
  };

  public type AppRole = {
    #Admin;
    #Staff;
    #Karigar;
  };

  public type UserProfile = {
    name : Text;
    appRole : AppRole;
    karigarName : ?Text;
    isCreated : Bool;
  };

  public type ActivityLogEntry = {
    userId : Principal;
    timestamp : Time.Time;
    action : Text;
    details : Text;
  };

  public type BlockedUserInfo = {
    isBlocked : Bool;
    lastBlocked : ?Time.Time;
    reason : ?Text;
  };

  public type DesignImage = {
    imageName : Text;
    blob : BlobStorage.ExternalBlob;
  };

  public type DesignImageMapping = {
    designCode : Text;
    genericName : Text;
    image : BlobStorage.ExternalBlob;
    createdBy : Principal;
    createdAt : Time.Time;
  };

  type OldActor = {
    approvals : UserApproval.UserApprovalState;
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    blockedUsers : Map.Map<Principal, BlockedUserInfo>;
    karigarStorage : Map.Map<Text, {
      name : Text;
      isActive : Bool;
    }>;
    masterDesignsMap : Map.Map<Text, MasterDesignEntry>;
    ordersMap : Map.Map<Text, PersistentOrder>;
    unmappedDesignCodesMap : Map.Map<Text, UnmappedOrderEntry>;
    activityLog : List.List<ActivityLogEntry>;
    designImageMappings : Map.Map<Text, DesignImageMapping>;
    designImages : Map.Map<Text, DesignImage>;
  };

  type NewActor = {
    approvals : UserApproval.UserApprovalState;
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    blockedUsers : Map.Map<Principal, BlockedUserInfo>;
    karigarStorage : Map.Map<Text, {
      name : Text;
      isActive : Bool;
    }>;
    masterDesignsMap : Map.Map<Text, MasterDesignEntry>;
    ordersMap : Map.Map<Text, PersistentOrder>;
    unmappedDesignCodesMap : Map.Map<Text, UnmappedOrderEntry>;
    activityLog : List.List<ActivityLogEntry>;
    designImageMappings : Map.Map<Text, DesignImageMapping>;
    designImages : Map.Map<Text, DesignImage>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
