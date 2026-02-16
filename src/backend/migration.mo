import Map "mo:core/Map";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";

module {
  public type PersistentOrder = {
    orderNo : Text;
    orderType : Text;
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    weight : Float;
    size : Float;
    qty : Nat;
    remarks : Text;
    status : Text;
    isCustomerOrder : Bool;
    uploadDate : Int;
    createdAt : Int;
  };

  public type HealthCheckResponse = { status : Text; canisterId : Text };

  public type Order = PersistentOrder;

  public type MasterDesignEntry = {
    genericName : Text;
    karigarName : Text;
    isActive : Bool;
  };

  public type UnmappedOrderEntry = {
    orderNo : Text;
    orderType : Text;
    designCode : Text;
    weight : Float;
    size : Float;
    qty : Nat;
    remarks : Text;
    isCustomerOrder : Bool;
    uploadDate : Int;
    createdAt : Int;
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
  };

  public type BulkOrderUpdate = {
    orderNos : [Text];
    newStatus : Text;
  };

  public type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    approvalState : UserApproval.UserApprovalState;
    userProfiles : Map.Map<Principal, UserProfile>;
    masterDesignsMap : Map.Map<Text, MasterDesignEntry>;
    ordersMap : Map.Map<Text, PersistentOrder>;
    unmappedDesignCodesMap : Map.Map<Text, UnmappedOrderEntry>;
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    approvalState : UserApproval.UserApprovalState;
    userProfiles : Map.Map<Principal, UserProfile>;
    masterDesignsMap : Map.Map<Text, MasterDesignEntry>;
    ordersMap : Map.Map<Text, PersistentOrder>;
    unmappedDesignCodesMap : Map.Map<Text, UnmappedOrderEntry>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
