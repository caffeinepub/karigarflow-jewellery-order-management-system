import Map "mo:core/Map";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import Migration "migration";

(with migration = Migration.run)
actor {
  type PersistentOrder = {
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
    uploadDate : Time.Time;
    createdAt : Time.Time;
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
  };

  public type BulkOrderUpdate = {
    orderNos : [Text];
    newStatus : Text;
  };

  // Health Check
  public query ({ caller }) func healthCheck() : async HealthCheckResponse {
    {
      status = "OK";
      canisterId = "unknown";
    };
  };

  // Initialize Authorization & Approval
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let approvalState = UserApproval.initState(accessControlState);

  // Persistent State Maps
  let userProfiles = Map.empty<Principal, UserProfile>();
  let masterDesignsMap = Map.empty<Text, MasterDesignEntry>();
  let ordersMap = Map.empty<Text, PersistentOrder>();
  let unmappedDesignCodesMap = Map.empty<Text, UnmappedOrderEntry>();

  // Helper Functions
  func validateOrder(order : PersistentOrder) : Bool {
    order.orderNo != "" and order.designCode != "" and order.orderType != "" and order.qty != 0
  };

  func validateDesignCode(designCode : Text) : Bool {
    designCode != "";
  };

  func isAdminOrStaff(caller : Principal) : Bool {
    switch (getAppRole(caller)) {
      case (?#Admin) { true };
      case (?#Staff) { true };
      case _ { false };
    };
  };

  func getAppRole(caller : Principal) : ?AppRole {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      switch (userProfiles.get(caller)) {
        case (?profile) { ?profile.appRole };
        case null { ?#Admin };
      };
    } else {
      switch (userProfiles.get(caller)) {
        case (?profile) { ?profile.appRole };
        case null { null };
      };
    };
  };

  func getKarigarName(caller : Principal) : ?Text {
    switch (userProfiles.get(caller)) {
      case (?profile) {
        switch (profile.appRole) {
          case (#Karigar) { profile.karigarName };
          case _ { null };
        };
      };
      case null { null };
    };
  };

  func normalizeDesignCode(designCode : Text) : Text {
    let trimmed = designCode.trim(#char(' '));
    trimmed.replace(#text("  "), " ");
  };

  // State Queries
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.isAdmin(accessControlState, caller) or AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getOrders() : async [PersistentOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view orders");
    };

    // Only karigar users need to be approved to view orders, admins and staff are exempt
    switch (getAppRole(caller)) {
      case (?#Karigar) {
        if (not AccessControl.isAdmin(accessControlState, caller) and not UserApproval.isApproved(approvalState, caller)) {
          Runtime.trap("Unauthorized: Karigar users must be approved to view orders");
        };
      };
      case (_) {};
    };

    let allOrders = ordersMap.values().toArray();

    switch (getAppRole(caller)) {
      case (?#Admin) {
        allOrders.sort(
          func(a, b) {
            switch (Text.compare(a.designCode, b.designCode)) {
              case (#equal) { Nat.compare(a.qty, b.qty) };
              case (order) { order };
            };
          }
        );
      };
      case (?#Staff) {
        allOrders.sort(
          func(a, b) {
            switch (Text.compare(a.designCode, b.designCode)) {
              case (#equal) { Nat.compare(a.qty, b.qty) };
              case (order) { order };
            };
          }
        );
      };
      case (?#Karigar) {
        switch (getKarigarName(caller)) {
          case (?karigarName) {
            let filtered = allOrders.filter(
              func(order) { order.karigarName == karigarName }
            );
            filtered.sort(
              func(a, b) {
                switch (Text.compare(a.designCode, b.designCode)) {
                  case (#equal) { Nat.compare(a.qty, b.qty) };
                  case (order) { order };
                };
              }
            );
          };
          case null { Runtime.trap("Karigar profile missing karigarName") };
        };
      };
      case null { Runtime.trap("User profile not found") };
    };
  };

  public query ({ caller }) func getUnmappedDesignCodes() : async [UnmappedOrderEntry] {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can view unmapped design codes");
    };
    unmappedDesignCodesMap.values().toArray();
  };

  public query ({ caller }) func getMasterDesigns() : async [(Text, MasterDesignEntry)] {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can view master designs");
    };
    masterDesignsMap.toArray();
  };

  // Bulk Order Update Function
  public shared ({ caller }) func bulkUpdateOrderStatus(bulkUpdate : BulkOrderUpdate) : async () {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin and Staff can update order status in bulk");
    };

    for (orderNo in bulkUpdate.orderNos.values()) {
      switch (ordersMap.get(orderNo)) {
        case (?order) {
          let updatedOrder : PersistentOrder = {
            order with status = bulkUpdate.newStatus;
          };
          ordersMap.add(orderNo, updatedOrder);
        };
        case (null) { Runtime.trap("Order with orderNo " # orderNo # " not found") };
      };
    };
  };

  public shared ({ caller }) func uploadParsedOrders(parsedOrders : [PersistentOrder]) : async () {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can upload orders");
    };

    for (order in parsedOrders.values()) {
      let normalizedDesignCode = normalizeDesignCode(order.designCode);
      let finalOrder = { order with uploadDate = if (order.uploadDate <= 0) { Time.now() } else { order.uploadDate } };
      switch (masterDesignsMap.get(normalizedDesignCode)) {
        case (null) {
          let unmappedOrder : UnmappedOrderEntry = {
            orderNo = finalOrder.orderNo;
            orderType = finalOrder.orderType;
            designCode = finalOrder.designCode;
            weight = finalOrder.weight;
            size = finalOrder.size;
            qty = finalOrder.qty;
            remarks = finalOrder.remarks;
            isCustomerOrder = finalOrder.isCustomerOrder;
            uploadDate = finalOrder.uploadDate;
            createdAt = finalOrder.createdAt;
          };
          unmappedDesignCodesMap.add(unmappedOrder.orderNo # "-" # unmappedOrder.designCode, unmappedOrder);
        };
        case (?masterDesign) {
          if (masterDesign.isActive) {
            let correctOrder : PersistentOrder = {
              orderNo = finalOrder.orderNo;
              orderType = finalOrder.orderType;
              designCode = finalOrder.designCode;
              genericName = masterDesign.genericName;
              karigarName = switch (finalOrder.karigarName == "") {
                case (true) { masterDesign.karigarName };
                case (false) { finalOrder.karigarName };
              };
              weight = finalOrder.weight;
              size = finalOrder.size;
              qty = finalOrder.qty;
              remarks = finalOrder.remarks;
              status = "pending";
              isCustomerOrder = finalOrder.isCustomerOrder;
              uploadDate = finalOrder.uploadDate;
              createdAt = finalOrder.createdAt;
            };
            ordersMap.add(finalOrder.orderNo, correctOrder);
          } else {
            let unmappedOrder : UnmappedOrderEntry = {
              orderNo = finalOrder.orderNo;
              orderType = finalOrder.orderType;
              designCode = finalOrder.designCode;
              weight = finalOrder.weight;
              size = finalOrder.size;
              qty = finalOrder.qty;
              remarks = finalOrder.remarks;
              isCustomerOrder = finalOrder.isCustomerOrder;
              uploadDate = finalOrder.uploadDate;
              createdAt = finalOrder.createdAt;
            };
            unmappedDesignCodesMap.add(unmappedOrder.orderNo # "-" # unmappedOrder.designCode, unmappedOrder);
          };
        };
      };
    };
  };

  // Master Designs Management
  public shared ({ caller }) func saveMasterDesigns(masterDesigns : [(Text, MasterDesignEntry)]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only Admin can save master designs");
    };

    for (entry in masterDesigns.values()) {
      if (not validateDesignCode(entry.0)) {
        Runtime.trap("Invalid design code");
      };
    };

    for (entry in masterDesigns.values()) {
      let normalizedKey = normalizeDesignCode(entry.0);
      masterDesignsMap.add(normalizedKey, entry.1);
    };

    processUnmappedOrders();
  };

  public shared ({ caller }) func setActiveFlagForMasterDesign(designCode : Text, isActive : Bool) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set active flag");
    };

    let normalizedDesignCode = normalizeDesignCode(designCode);
    let existingEntry = masterDesignsMap.get(normalizedDesignCode);

    let updatedEntry : MasterDesignEntry = switch (existingEntry) {
      case (null) { Runtime.trap("Master design not found") };
      case (?entry) {
        {
          genericName = entry.genericName;
          karigarName = entry.karigarName;
          isActive;
        };
      };
    };
    masterDesignsMap.add(normalizedDesignCode, updatedEntry);
  };

  // Approval Functions
  public query ({ caller }) func isCallerApproved() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check approval status");
    };
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  public shared ({ caller }) func requestApproval() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can request approval");
    };
    UserApproval.setApproval(approvalState, caller, #pending);
  };

  public shared ({ caller }) func createUserProfile(user : Principal, profile : UserProfile) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create user profiles");
    };

    let accessRole : AccessControl.UserRole = switch (profile.appRole) {
      case (#Admin) { #admin };
      case (#Staff) { #user };
      case (#Karigar) { #user };
    };

    AccessControl.assignRole(accessControlState, caller, user, accessRole);
    userProfiles.add(user, profile);
  };

  // Internal Process Unmapped Orders
  func processUnmappedOrders() {
    let unmappedEntries = unmappedDesignCodesMap.toArray();

    for ((key, unmappedOrder) in unmappedEntries.values()) {
      let normalizedDesignCode = normalizeDesignCode(unmappedOrder.designCode);
      switch (masterDesignsMap.get(normalizedDesignCode)) {
        case (?masterDesign) {
          let order : PersistentOrder = {
            orderNo = unmappedOrder.orderNo;
            orderType = unmappedOrder.orderType;
            designCode = unmappedOrder.designCode;
            genericName = masterDesign.genericName;
            karigarName = masterDesign.karigarName;
            weight = unmappedOrder.weight;
            size = unmappedOrder.size;
            qty = unmappedOrder.qty;
            remarks = unmappedOrder.remarks;
            status = "pending";
            isCustomerOrder = unmappedOrder.isCustomerOrder;
            uploadDate = unmappedOrder.uploadDate;
            createdAt = unmappedOrder.createdAt;
          };
          ordersMap.add(order.orderNo, order);
          unmappedDesignCodesMap.remove(key);
        };
        case null {};
      };
    };
  };
};
