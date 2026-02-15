// System imports
import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

// Component imports
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";

// KEEP THIS FILE CLEAN: Put types and core state into state module and move logic into isolated modules
actor {
  public type HealthCheckResponse = {
    status : Text;
    canisterId : Text;
  };

  public query ({ caller }) func healthCheck() : async HealthCheckResponse {
    {
      status = "OK";
      canisterId = "anonymous";
    };
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let approvalState = UserApproval.initState(accessControlState);

  module DesignCode {
    public type DesignCode = Text;

    public func compareByDesignCode(designCode1 : DesignCode, designCode2 : DesignCode) : Order.Order {
      Text.compare(designCode1, designCode2);
    };
  };

  module MasterDesignEntry {
    public type MasterDesignEntry = {
      genericName : Text;
      karigarName : Text;
      isActive : Bool;
    };

    public func compare(entry1 : MasterDesignEntry, entry2 : MasterDesignEntry) : Order.Order {
      switch (Text.compare(entry1.genericName, entry2.genericName)) {
        case (#equal) { Text.compare(entry1.karigarName, entry2.karigarName) };
        case (order) { order };
      };
    };

    public func compareByKarigarName(entry1 : MasterDesignEntry, entry2 : MasterDesignEntry) : Order.Order {
      Text.compare(entry1.karigarName, entry2.karigarName);
    };
  };

  module OrderModule {
    public type Order = {
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

    public func compare(order1 : Order, order2 : Order) : Order.Order {
      switch (Text.compare(order1.orderNo, order2.orderNo)) {
        case (#equal) { Text.compare(order1.designCode, order2.designCode) };
        case (order) { order };
      };
    };

    public func compareByDesignCode(order1 : Order, order2 : Order) : Order.Order {
      Text.compare(order1.designCode, order2.designCode);
    };
  };

  module UnmappedOrderEntry {
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

    public func compare(entry1 : UnmappedOrderEntry, entry2 : UnmappedOrderEntry) : Order.Order {
      switch (Text.compare(entry1.orderNo, entry2.orderNo)) {
        case (#equal) { Text.compare(entry1.designCode, entry2.designCode) };
        case (order) { order };
      };
    };

    public func compareByDesignCode(entry1 : UnmappedOrderEntry, entry2 : UnmappedOrderEntry) : Order.Order {
      Text.compare(entry1.designCode, entry2.designCode);
    };
  };

  // Application-specific role type
  public type AppRole = {
    #Admin;
    #Staff;
    #Karigar;
  };

  public type UserProfile = {
    name : Text;
    appRole : AppRole;
    karigarName : ?Text; // Only set for Karigar role
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let masterDesignsMap = Map.empty<DesignCode.DesignCode, MasterDesignEntry.MasterDesignEntry>();
  let ordersMap = Map.empty<Text, OrderModule.Order>();
  let unmappedDesignCodesMap = Map.empty<Text, UnmappedOrderEntry.UnmappedOrderEntry>();

  // Approval management functions

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  // Function to set approval status - Only Admins can call this.
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

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // Allow admins and users to call this function
    // Admins can call this even without a profile (returns null)
    // Users with #user permission can call this
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

  // Admin only: Create user profile for others
  public shared ({ caller }) func createUserProfile(user : Principal, profile : UserProfile) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create user profiles");
    };

    // Assign the appropriate AccessControl role based on app role
    let accessRole : AccessControl.UserRole = switch (profile.appRole) {
      case (#Admin) { #admin };
      case (#Staff) { #user };
      case (#Karigar) { #user };
    };

    AccessControl.assignRole(accessControlState, caller, user, accessRole);
    userProfiles.add(user, profile);
  };

  // Helper function to get app role
  func getAppRole(caller : Principal) : ?AppRole {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      switch (userProfiles.get(caller)) {
        case (?profile) { ?profile.appRole };
        case null { ?#Admin }; // Admin without profile yet
      };
    } else {
      switch (userProfiles.get(caller)) {
        case (?profile) { ?profile.appRole };
        case null { null };
      };
    };
  };

  // Helper function to check if caller is Admin or Staff
  func isAdminOrStaff(caller : Principal) : Bool {
    switch (getAppRole(caller)) {
      case (?#Admin) { true };
      case (?#Staff) { true };
      case _ { false };
    };
  };

  // Helper function to get karigar name for Karigar users
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

  // Upload parsed orders (generic+karigarName assigned in backend based on master designs)
  public shared ({ caller }) func uploadParsedOrders(parsedOrders : [OrderModule.Order]) : async () {
    // Only Admin or Staff can upload orders
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can upload orders");
    };

    let newOrders = List.empty<OrderModule.Order>();
    let newUnmappedOrders = List.empty<UnmappedOrderEntry.UnmappedOrderEntry>();
    for (order in parsedOrders.values()) {
      let masterDesign = masterDesignsMap.get(order.designCode);

      switch (masterDesign) {
        case (null) {
          let unmappedOrder : UnmappedOrderEntry.UnmappedOrderEntry = {
            orderNo = order.orderNo;
            orderType = order.orderType;
            designCode = order.designCode;
            weight = order.weight;
            size = order.size;
            qty = order.qty;
            remarks = order.remarks;
            isCustomerOrder = order.isCustomerOrder;
            uploadDate = order.uploadDate;
            createdAt = order.createdAt;
          };

          unmappedDesignCodesMap.add(unmappedOrder.orderNo # "-" # unmappedOrder.designCode, unmappedOrder);
        };
        case (?masterDesignValue) {
          let correctOrder : OrderModule.Order = {
            orderNo = order.orderNo;
            orderType = order.orderType;
            designCode = order.designCode;
            genericName = masterDesignValue.genericName;
            karigarName = masterDesignValue.karigarName;
            weight = order.weight;
            size = order.size;
            qty = order.qty;
            remarks = order.remarks;
            status = "pending";
            isCustomerOrder = order.isCustomerOrder;
            uploadDate = order.uploadDate;
            createdAt = order.createdAt;
          };
          ordersMap.add(order.orderNo, correctOrder);
        };
      };
    };
  };

  public shared ({ caller }) func saveMasterDesigns(masterDesigns : [(DesignCode.DesignCode, MasterDesignEntry.MasterDesignEntry)]) : async () {
    // Only Admin can save master designs
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only Admin can save master designs");
    };

    for (entry in masterDesigns.values()) {
      if (not validateDesignCode(entry.0)) {
        Runtime.trap("Invalid design code");
      };
    };

    for (entry in masterDesigns.values()) {
      masterDesignsMap.add(entry.0, entry.1);
    };

    processUnmappedOrders();
  };

  public query ({ caller }) func getOrders() : async [OrderModule.Order] {
    // Require at least user permission
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view orders");
    };

    // Retrieve only the values (orders) from the map
    let allOrders = ordersMap.values().toArray();

    // Filter based on role
    switch (getAppRole(caller)) {
      case (?#Admin) {
        // Admin sees all orders
        allOrders;
      };
      case (?#Staff) {
        // Staff sees all orders
        allOrders;
      };
      case (?#Karigar) {
        // Karigar sees only their assigned orders
        switch (getKarigarName(caller)) {
          case (?karigarName) {
            let filtered = List.empty<OrderModule.Order>();
            for (order in allOrders.values()) {
              if (order.karigarName == karigarName) {
                filtered.add(order);
              };
            };
            filtered.toArray();
          };
          case null {
            Runtime.trap("Karigar profile missing karigarName");
          };
        };
      };
      case null {
        Runtime.trap("User profile not found");
      };
    };
  };

  public query ({ caller }) func getUnmappedDesignCodes() : async [UnmappedOrderEntry.UnmappedOrderEntry] {
    // Only Admin or Staff can view unmapped design codes
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can view unmapped design codes");
    };

    // Return only the values (UnmappedOrderEntry.UnmappedOrderEntry) from the map
    unmappedDesignCodesMap.values().toArray();
  };

  public query ({ caller }) func getMasterDesigns() : async [(DesignCode.DesignCode, MasterDesignEntry.MasterDesignEntry)] {
    // Only Admin or Staff can view master designs
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can view master designs");
    };

    masterDesignsMap.toArray();
  };

  public shared ({ caller }) func deleteOrder(orderNo : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete orders");
    };
    ordersMap.remove(orderNo);
  };

  public shared ({ caller }) func setActiveFlagForMasterDesign(designCode : DesignCode.DesignCode, isActive : Bool) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set active flag");
    };

    let existingEntry = masterDesignsMap.get(designCode);

    let updatedEntry : MasterDesignEntry.MasterDesignEntry = switch (existingEntry) {
      case (null) { Runtime.trap("Master design not found") };
      case (?entry) {
        {
          genericName = entry.genericName;
          karigarName = entry.karigarName;
          isActive;
        };
      };
    };
    masterDesignsMap.add(designCode, updatedEntry);
  };

  func validateOrder(order : OrderModule.Order) : Bool {
    if (order.orderNo == "" or order.designCode == "" or order.orderType == "" or order.qty == 0) {
      false;
    } else { true };
  };

  func validateDesignCode(designCode : DesignCode.DesignCode) : Bool {
    designCode != "";
  };

  func processUnmappedOrders() {
    let unmappedEntries = unmappedDesignCodesMap.toArray();

    for ((key, unmappedOrder) in unmappedEntries.values()) {
      switch (masterDesignsMap.get(unmappedOrder.designCode)) {
        case (?masterDesign) {
          // Found mapping, create order
          let order : OrderModule.Order = {
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
        case null {
          // Still unmapped, keep in unmapped list
        };
      };
    };
  };

  // Empty implementation to satisfy static checks
  public shared ({ caller }) func requestApproval() : async () {};
};

