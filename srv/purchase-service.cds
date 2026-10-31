
using po.management as db from '../db/schema';

service PurchaseService {
  entity Suppliers as projection on db.Suppliers;
  entity CompanyCodes as projection on db.CompanyCodes;
  entity PurchasingOrganizations as projection on db.PurchasingOrganizations;
  entity PurchasingGroups as projection on db.PurchasingGroups;
  entity Materials as projection on db.Materials;

  entity PurchaseOrders as projection on db.PurchaseOrders actions {

    action submitForApproval() returns String;

    action approvePurchaseOrder(comments : LargeString) returns String;

    action rejectPurchaseOrder(comments : LargeString) returns String;
  };

  entity PurchaseOrderItems as projection on db.PurchaseOrderItems;
  entity ApprovalRequests as projection on db.ApprovalRequests;

  entity SupplierCompanyAuthorizations as projection on db.SupplierCompanyAuthorizations;
  entity SupplierMaterials as projection on db.SupplierMaterials;
  entity CompanyMaterials as projection on db.CompanyMaterials;
  entity PurchasingOrgAssignments as projection on db.PurchasingOrgAssignments;
}



