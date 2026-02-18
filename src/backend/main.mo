import Nat "mo:core/Nat";
import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";

import BlobStorage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinStorage "blob-storage/Mixin";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Persistent Types
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
  };

  type PartialFulfillmentQty = {
    orderNo : Text;
    suppliedQty : Nat;
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

  type PersistentKarigar = {
    name : Text;
    isActive : Bool;
  };

  type DesignImage = {
    imageName : Text;
    blob : BlobStorage.ExternalBlob;
  };

  type DesignImageMapping = {
    designCode : Text;
    genericName : Text;
    image : BlobStorage.ExternalBlob;
    createdBy : Principal;
    createdAt : Time.Time;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();
  let approvals = UserApproval.initState(accessControlState);

  var userProfiles = Map.empty<Principal, UserProfile>();
  var masterDesignsMap = Map.empty<Text, MasterDesignEntry>();
  var ordersMap = Map.empty<Text, PersistentOrder>();
  var unmappedDesignCodesMap = Map.empty<Text, UnmappedOrderEntry>();
  var activityLog = List.empty<ActivityLogEntry>();

  var blockedUsers = Map.empty<Principal, BlockedUserInfo>();
  var designImageMappings = Map.empty<Text, DesignImageMapping>();
  var designImages = Map.empty<Text, DesignImage>();

  let karigarStorage = Map.empty<Text, PersistentKarigar>();

  // Types
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

  public type HealthCheckResponse = {
    status : Text;
    canisterId : Text;
  };

  public type HallmarkReturnRequest = {
    orderNos : [Text];
    actionType : {
      #return_hallmark;
      #update_status;
    };
  };

  public type PartialFulfillmentRequest = {
    entries : [PartialFulfillmentQty];
  };

  public type BlockedUserInfo = {
    isBlocked : Bool;
    lastBlocked : ?Time.Time;
    reason : ?Text;
  };

  public type BlockUserRequest = {
    user : Principal;
    reason : ?Text;
  };

  public type BulkOrderUpdate = {
    orderNos : [Text];
    newStatus : Text;
  };

  public type UpdateOrderTotalSuppliedRequest = {
    orderNo : Text;
    newTotalSupplied : Nat;
  };

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

  func isBlockedUser(user : Principal) : Bool {
    switch (blockedUsers.get(user)) {
      case (null) { false };
      case (?info) { info.isBlocked };
    };
  };

  func checkBlockedUser(caller : Principal) {
    if (isBlockedUser(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Access Denied: Your user is currently blocked. Please contact admin");
    };
  };

  func recordActivity(userId : Principal, action : Text, details : Text) {
    let entry : ActivityLogEntry = {
      userId = userId;
      timestamp = Time.now();
      action;
      details : Text;
    };
    activityLog.add(entry);
  };

  // Karigar management functions
  public shared ({ caller }) func createKarigar(karigar : PersistentKarigar) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (karigar.name == "") {
      Runtime.trap("Karigar name cannot be empty");
    };
    if (karigarStorage.containsKey(karigar.name)) {
      Runtime.trap("Karigar already exists. Please enter a unique new name for " # karigar.name);
    };
    karigarStorage.add(karigar.name, karigar);
  };

  public shared ({ caller }) func updateOrdersForNewKarigar(designCode : Text, newKarigarName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    let normalizedDesignCode = normalizeDesignCode(designCode);

    if (not karigarStorage.containsKey(newKarigarName)) {
      Runtime.trap("Karigar name '" # newKarigarName # "' does not exist. Please create the karigar first.");
    };

    // Only update orders with non-"given_to_hallmark" status
    let pendingOrders = ordersMap.filter(
      func(_orderNo, order) { order.designCode == normalizedDesignCode and order.status != "given_to_hallmark" }
    );

    for ((orderNo, order) in pendingOrders.entries()) {
      let updatedOrder = { order with karigarName = newKarigarName };
      ordersMap.add(orderNo, updatedOrder);
    };
    recordActivity(caller, "updateOrdersForNewKarigar", "Karigar name updated for pending orders with design code: " # normalizedDesignCode);
  };

  public shared ({ caller }) func deleteKarigarByName(karigarName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (not karigarStorage.containsKey(karigarName)) {
      Runtime.trap("Karigar with name " # karigarName # " does not exist. Please enter a valid karigar name");
    };
    karigarStorage.remove(karigarName);
  };

  public query ({ caller }) func listKarigars() : async [PersistentKarigar] {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can list karigars");
    };
    karigarStorage.values().toArray();
  };

  public query ({ caller }) func listDistinctKarigars() : async [PersistentKarigar] {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can list karigars");
    };

    let allKarigars = karigarStorage.values().toArray();
    let uniqueKarigars = allKarigars.filter(
      func(karigar) {
        not allKarigars.foldLeft(false, func(acc, other) { acc or (other.name != karigar.name and not compareKarigarsStrict(karigar, other)) });
      }
    );
    uniqueKarigars;
  };

  func compareKarigarsStrict(karigar1 : PersistentKarigar, karigar2 : PersistentKarigar) : Bool {
    karigar1.name == karigar2.name and karigar1.isActive == karigar2.isActive;
  };

  // -- State Queries
  public query func healthCheck() : async HealthCheckResponse {
    { status = "OK"; canisterId = "reverted-to-v54-compat" };
  };

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

  public query ({ caller }) func listUserProfiles() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    userProfiles.values().toArray();
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    checkBlockedUser(caller);
    userProfiles.add(caller, profile);
    recordActivity(caller, "saveCallerUserProfile", "User: " # caller.toText());
  };

  public shared ({ caller }) func getOrders() : async [PersistentOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view orders");
    };

    checkBlockedUser(caller);

    switch (getAppRole(caller)) {
      case (?#Karigar) {
        if (not AccessControl.isAdmin(accessControlState, caller) and not UserApproval.isApproved(approvals, caller)) {
          Runtime.trap("Unauthorized: Karigar users must be approved to view orders");
        };
      };
      case (_) {};
    };

    let allOrders = ordersMap.values().toArray();

    switch (getAppRole(caller)) {
      case (?#Admin) {
        recordActivity(caller, "getOrders", "Admin retrieved all orders");
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
        recordActivity(caller, "getOrders", "Staff retrieved all orders");
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
        recordActivity(caller, "getOrders", "Karigar retrieved orders");
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

  public shared ({ caller }) func getActiveOrdersForKarigar() : async [PersistentOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view active orders");
    };

    checkBlockedUser(caller);

    switch (getAppRole(caller)) {
      case (?#Karigar) {
        if (not AccessControl.isAdmin(accessControlState, caller) and not UserApproval.isApproved(approvals, caller)) {
          Runtime.trap("Unauthorized: Karigar users must be approved to view active orders");
        };
      };
      case (_) {};
    };

    let allOrders = ordersMap.values().toArray();
    switch (getAppRole(caller)) {
      case (?#Karigar) {
        switch (getKarigarName(caller)) {
          case (?karigarName) {
            let filtered = allOrders.filter(
              func(order) {
                order.karigarName == karigarName and order.status == "pending" and not order.designCode.endsWith(#text "hallmark")
              }
            );
            recordActivity(caller, "getActiveOrdersForKarigar", "Karigar retrieved active orders");
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
      case _ { Runtime.trap("Function restricted to #Karigar users") };
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

  public shared ({ caller }) func bulkUpdateOrderStatus(bulkUpdate : BulkOrderUpdate) : async () {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin and Staff can update order status in bulk");
    };
    checkBlockedUser(caller);

    if (bulkUpdate.newStatus == "delivered") {
      for (orderNo in bulkUpdate.orderNos.values()) {
        switch (ordersMap.get(orderNo)) {
          case (?order) {
            if (order.status != "given_to_hallmark") {
              Runtime.trap("Unauthorized: Admin and Staff can only mark orders as delivered when returning from Hallmark (current status must be 'given_to_hallmark')");
            };
          };
          case (null) { Runtime.trap("Order with orderNo " # orderNo # " not found") };
        };
      };
    };

    // Update all orders
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

    recordActivity(caller, "bulkUpdateOrderStatus", "Bulk status update to " # bulkUpdate.newStatus);
  };

  // Karigar users can mark orders as delivered
  public shared ({ caller }) func markOrderAsDelivered(orderNo : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can mark orders as delivered");
    };

    checkBlockedUser(caller);

    // Verify caller is a Karigar user
    switch (getAppRole(caller)) {
      case (?#Karigar) {
        // Karigar must be approved
        if (not AccessControl.isAdmin(accessControlState, caller) and not UserApproval.isApproved(approvals, caller)) {
          Runtime.trap("Unauthorized: Karigar users must be approved to mark orders as delivered");
        };
      };
      case (?#Admin) {
        Runtime.trap("Unauthorized: Only Karigar users can mark orders as delivered");
      };
      case (?#Staff) {
        Runtime.trap("Unauthorized: Only Karigar users can mark orders as delivered");
      };
      case null {
        Runtime.trap("Unauthorized: User profile not found");
      };
    };

    // Get the order
    switch (ordersMap.get(orderNo)) {
      case (?order) {
        // Verify the order belongs to this Karigar
        switch (getKarigarName(caller)) {
          case (?karigarName) {
            if (order.karigarName != karigarName) {
              Runtime.trap("Unauthorized: Can only mark your own orders as delivered");
            };
          };
          case null {
            Runtime.trap("Karigar profile missing karigarName");
          };
        };

        // Update order status to delivered
        let updatedOrder : PersistentOrder = {
          order with status = "delivered";
        };
        ordersMap.add(orderNo, updatedOrder);

        recordActivity(caller, "markOrderAsDelivered", "Order " # orderNo # " marked as delivered by Karigar");
      };
      case null {
        Runtime.trap("Order with orderNo " # orderNo # " not found");
      };
    };
  };

  // Karigar users can mark multiple orders as delivered
  public shared ({ caller }) func bulkMarkOrdersAsDelivered(orderNos : [Text]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can mark orders as delivered");
    };

    checkBlockedUser(caller);

    // Verify caller is a Karigar user
    switch (getAppRole(caller)) {
      case (?#Karigar) {
        // Karigar must be approved
        if (not AccessControl.isAdmin(accessControlState, caller) and not UserApproval.isApproved(approvals, caller)) {
          Runtime.trap("Unauthorized: Karigar users must be approved to mark orders as delivered");
        };
      };
      case (?#Admin) {
        Runtime.trap("Unauthorized: Only Karigar users can mark orders as delivered");
      };
      case (?#Staff) {
        Runtime.trap("Unauthorized: Only Karigar users can mark orders as delivered");
      };
      case null {
        Runtime.trap("Unauthorized: User profile not found");
      };
    };

    // Update all specified orders
    for (orderNo in orderNos.values()) {
      switch (ordersMap.get(orderNo)) {
        case (?order) {
          switch (getKarigarName(caller)) {
            case (?karigarName) {
              if (order.karigarName == karigarName) {
                let updatedOrder : PersistentOrder = {
                  order with status = "delivered";
                };
                ordersMap.add(orderNo, updatedOrder);
              } else {
                Runtime.trap("Unauthorized: Can only mark your own orders as delivered");
              };
            };
            case null {
              Runtime.trap("Karigar profile missing karigarName");
            };
          };
        };
        case null {
          Runtime.trap("Order with orderNo " # orderNo # " not found");
        };
      };
    };

    recordActivity(caller, "bulkMarkOrdersAsDelivered", "Multiple orders marked as delivered by Karigar");
  };

  public shared ({ caller }) func handleHallmarkReturns(request : HallmarkReturnRequest) : async () {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin and Staff can handle hallmark returns");
    };
    checkBlockedUser(caller);

    switch (request.actionType) {
      case (#return_hallmark) {
        for (orderNo in request.orderNos.values()) {
          switch (ordersMap.get(orderNo)) {
            case (?order) {
              if (order.status == "given_to_hallmark") {
                let updatedOrder : PersistentOrder = {
                  order with status = "delivered";
                };
                ordersMap.add(orderNo, updatedOrder);
              } else {
                Runtime.trap("Cannot return orders that are not in given_to_hallmark status");
              };
            };
            case (null) { Runtime.trap("Order with orderNo " # orderNo # " not found") };
          };
        };
        recordActivity(
          caller,
          "handleHallmarkReturns",
          "Orders returned from hallmark"
        );
      };
      case (#update_status) {
        for (orderNo in request.orderNos.values()) {
          switch (ordersMap.get(orderNo)) {
            case (?order) {
              if (order.status == "delivered") {
                let updatedOrder : PersistentOrder = {
                  order with status = "given_to_hallmark";
                };
                ordersMap.add(orderNo, updatedOrder);
              } else {
                Runtime.trap("Cannot update status to hallmark unless it is delivered");
              };
            };
            case (null) { Runtime.trap("Order with orderNo " # orderNo # " not found") };
          };
        };
        recordActivity(
          caller,
          "handleHallmarkReturns",
          "Order status updated to hallmark"
        );
      };
    };
  };

  public shared ({ caller }) func processPartialFulfillment(request : PartialFulfillmentRequest) : async () {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin and Staff can process partial fulfillment");
    };
    checkBlockedUser(caller);

    for (fulfillment in request.entries.values()) {
      switch (ordersMap.get(fulfillment.orderNo)) {
        case (?order) {
          if (order.orderType == "RB" and order.status == "pending" and fulfillment.suppliedQty < order.qty) {
            updateOrderForPartialFulfillment(caller, order, fulfillment.suppliedQty);
          } else if (fulfillment.suppliedQty == order.qty) {
            updateOrderStatus(caller, fulfillment.orderNo, "given_to_hallmark");
          };
        };
        case null { Runtime.trap("Order with orderNo " # fulfillment.orderNo # " not found") };
      };
    };
  };

  func updateOrderForPartialFulfillment(caller : Principal, order : PersistentOrder, suppliedQty : Nat) {
    let remainingOrder : PersistentOrder = {
      order with qty = order.qty - suppliedQty
    };
    let hallmarkOrder : PersistentOrder = {
      order with qty = suppliedQty;
      status = "given_to_hallmark";
    };

    ordersMap.add(order.orderNo, remainingOrder);
    ordersMap.add(order.orderNo # "_hallmark", hallmarkOrder);

    recordActivity(
      caller,
      "updateOrderForPartialFulfillment",
      "Order " # order.orderNo # " split into remaining and hallmark orders"
    );
  };

  func updateOrderStatus(caller : Principal, orderNo : Text, newStatus : Text) {
    switch (ordersMap.get(orderNo)) {
      case (?order) {
        let updatedOrder : PersistentOrder = {
          order with status = newStatus;
        };
        ordersMap.add(orderNo, updatedOrder);

        recordActivity(
          caller,
          "updateOrderStatus",
          "Order " # orderNo # " status updated to " # newStatus
        );
      };
      case null { Runtime.trap("Order not found") };
    };
  };

  public shared ({ caller }) func uploadParsedOrders(parsedOrders : [PersistentOrder]) : async () {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can upload orders");
    };
    checkBlockedUser(caller);

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
    recordActivity(caller, "uploadParsedOrders", "Parsed orders uploaded");
  };

  public shared ({ caller }) func saveMasterDesigns(masterDesigns : [(Text, MasterDesignEntry)]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    checkBlockedUser(caller);

    for (entry in masterDesigns.values()) {
      if (not validateDesignCode(entry.0)) {
        Runtime.trap("Invalid design code");
      };
      // Validate that karigarName exists in karigarStorage
      if (not karigarStorage.containsKey(entry.1.karigarName)) {
        Runtime.trap("Karigar name '" # entry.1.karigarName # "' does not exist. Please create the karigar first.");
      };
    };

    for (entry in masterDesigns.values()) {
      let normalizedKey = normalizeDesignCode(entry.0);

      // Reassign pending orders instead of all matching orders
      let pendingOrders = ordersMap.filter(
        func(_orderNo, order) { order.designCode == normalizedKey and order.status != "given_to_hallmark" }
      );
      for ((orderNo, order) in pendingOrders.entries()) {
        let updatedOrder = { order with karigarName = entry.1.karigarName };
        ordersMap.add(orderNo, updatedOrder);
      };

      masterDesignsMap.add(normalizedKey, entry.1);
    };

    processUnmappedOrders();
    recordActivity(caller, "saveMasterDesigns", "Master designs saved");
  };

  public shared ({ caller }) func setActiveFlagForMasterDesign(designCode : Text, isActive : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    checkBlockedUser(caller);

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
    recordActivity(caller, "setActiveFlagForMasterDesign", "Master design flag updated");
  };

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

  public query ({ caller }) func getActivityLog() : async [ActivityLogEntry] {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can access activity log");
    };
    activityLog.toArray();
  };

  // Approval Functions
  public query ({ caller }) func isCallerApproved() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check approval status");
    };
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvals, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvals, user, status);
    recordActivity(caller, "setApproval", "Approval changed for user: " # user.toText());
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvals);
  };

  public shared ({ caller }) func requestApproval() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can request approval");
    };
    checkBlockedUser(caller);
    UserApproval.setApproval(approvals, caller, #pending);
    recordActivity(caller, "requestApproval", "Approval requested");
  };

  public shared ({ caller }) func createUserProfile(user : Principal, profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    let accessRole : AccessControl.UserRole = switch (profile.appRole) {
      case (#Admin) { #admin };
      case (#Staff) { #user };
      case (#Karigar) { #user };
    };

    let createdProfile : UserProfile = {
      name = profile.name;
      appRole = profile.appRole;
      karigarName = profile.karigarName;
      isCreated = true;
    };

    AccessControl.assignRole(accessControlState, caller, user, accessRole);
    userProfiles.add(user, createdProfile);
    recordActivity(caller, "createUserProfile", "User profile created for " # user.toText());
  };

  // Blocked User Functions
  public shared ({ caller }) func blockUser(request : BlockUserRequest) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    let blockInfo : BlockedUserInfo = {
      isBlocked = true;
      lastBlocked = ?Time.now();
      reason = request.reason;
    };
    blockedUsers.add(request.user, blockInfo);
    recordActivity(caller, "blockUser", "User " # request.user.toText() # " blocked");
  };

  public shared ({ caller }) func unblockUser(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    blockedUsers.add(
      user,
      {
        isBlocked = false;
        lastBlocked = ?Time.now();
        reason = null;
      },
    );
    recordActivity(caller, "unblockUser", "User " # user.toText() # " unblocked");
  };

  public query ({ caller }) func isUserBlocked(user : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    switch (blockedUsers.get(user)) {
      case (null) { false };
      case (?info) { info.isBlocked };
    };
  };

  public shared ({ caller }) func updateOrderTotalSupplied(request : UpdateOrderTotalSuppliedRequest) : async () {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin and Staff can update total supplied quantity");
    };
    checkBlockedUser(caller);

    if (request.orderNo.endsWith(#text "hallmark")) {
      Runtime.trap("Cannot update hallmark orders");
    };

    switch (ordersMap.get(request.orderNo)) {
      case (?originalOrder) {
        let originalTotal = originalOrder.qty;
        let updatedOrder = { originalOrder with qty = request.newTotalSupplied };

        ordersMap.add(request.orderNo, updatedOrder);
        switch (ordersMap.get(request.orderNo # "_hallmark")) {
          case (?hallmarkOrder) {
            let remainingQty = switch (originalTotal >= request.newTotalSupplied) {
              case (true) { request.newTotalSupplied };
              case (false) { originalTotal };
            };

            let updatedHallmark = {
              hallmarkOrder with qty = remainingQty;
              status = "given_to_hallmark";
            };
            ordersMap.add(request.orderNo # "_hallmark", updatedHallmark);
          };
          case null {};
        };
        recordActivity(caller, "updateOrderTotalSupplied", "Order " # request.orderNo # " updated");
      };
      case null { Runtime.trap("Order not found") };
    };
  };

  // -- Design-to-Image Mapping
  public query ({ caller }) func getAdminDesignImageMappings() : async [(DesignImageMapping, BlobStorage.ExternalBlob)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    let validMappings = designImageMappings.toArray();

    validMappings.map(
      func((key, mapping)) {
        (mapping, mapping.image);
      }
    );
  };

  public query ({ caller }) func getDesignImageMappings() : async [DesignImageMapping] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    designImageMappings.values().toArray();
  };

  public shared ({ caller }) func saveDesignImageMappings(parsedMappings : [DesignImageMapping]) : async [DesignImageMapping] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    let validatedMappings = parsedMappings.filter(
      func(mapping) {
        mapping.designCode != "" and
        mapping.genericName != "" and
        mapping.createdBy.isAnonymous() == false
      }
    );

    for (mapping in validatedMappings.values()) {
      designImageMappings.add(mapping.designCode, mapping);
    };

    validatedMappings;
  };

  // Returns all karigars from all sources as [Text]
  public query ({ caller }) func listKarigarsNames() : async [Text] {
    if (not isAdminOrStaff(caller)) {
      Runtime.trap("Unauthorized: Only Admin or Staff can list karigars");
    };

    let designKarigars = masterDesignsMap.toArray().map(
      func((_, entry)) { entry.karigarName }
    );
    designKarigars;
  };
};
