
namespace po.management;

using { cuid, managed } from '@sap/cds/common';

entity Suppliers : cuid, managed {
  supplierNumber : String(20) @mandatory;
  name           : String(100) @mandatory;
  city           : String(60);
  contact         : String(100);
  email           : String(120);
  phone           : String(20);
  address         : String(250);
  status           : String(20) default 'Active';
}

entity CompanyCodes : cuid {
  code        : String(10) @mandatory;
  description : String(100);
}

entity PurchasingOrganizations : cuid {
  code        : String(10) @mandatory;
  description : String(100);
}

entity PurchasingGroups : cuid {
  code        : String(10) @mandatory;
  description : String(100);
}

entity Materials : cuid, managed {
  materialNumber : String(40) @mandatory;
  description    : String(120);
  unit            : String(10);
}

entity PurchaseOrders : cuid, managed {
  poNumber                : String(20) @mandatory;
  supplier                : Association to Suppliers @mandatory;
  companyCode             : Association to CompanyCodes @mandatory;
  purchasingOrganization  : Association to PurchasingOrganizations @mandatory;
  purchasingGroup         : Association to PurchasingGroups @mandatory;
  documentDate            : Date @mandatory;
  deliveryDate            : Date;
  purchaseOrderType       : String(10) default 'NB';
  currency                : String(3) default 'INR';
  paymentTerms            : String(20);
  incoterms               : String(10);
  reference               : String(100);
  note                    : LargeString;
  status                  : String(30) default 'Draft';
  goodsReceiptStatus      : String(30) default 'Not Received';
  totalAmount             : Decimal(15,2);
  items                   : Composition of many PurchaseOrderItems
                              on items.purchaseOrder = $self;
  approvals               : Composition of many ApprovalRequests
                              on approvals.purchaseOrder = $self;
}

entity PurchaseOrderItems : cuid {
  purchaseOrder : Association to PurchaseOrders;
  material      : Association to Materials;
  description   : String(120);
  quantity      : Decimal(13,3);
  unit          : String(10);
  unitPrice     : Decimal(15,2);
  lineTotal     : Decimal(15,2);
}


entity ApprovalRequests : cuid, managed {
  purchaseOrder  : Association to PurchaseOrders @mandatory;
  approvalLevel  : Integer;
  approverRole   : String(20);
  approvalCycle  : Integer default 1;
  approver       : String(100);
  decision       : String(20) default 'Pending';
  comments       : LargeString;
  decidedAt      : Timestamp;
}


entity SupplierCompanyAuthorizations : cuid, managed {
  supplier   : Association to Suppliers @mandatory;
  companyCode : Association to CompanyCodes @mandatory;
  status     : String(20) default 'Active';
}

entity SupplierMaterials : cuid, managed {
  supplier  : Association to Suppliers @mandatory;
  material  : Association to Materials @mandatory;
  unitPrice : Decimal(15,2);
  currency  : String(3) default 'INR';
  status    : String(20) default 'Active';
}

entity CompanyMaterials : cuid, managed {
  companyCode : Association to CompanyCodes @mandatory;
  material    : Association to Materials @mandatory;
  status      : String(20) default 'Active';
}

entity PurchasingOrgAssignments : cuid, managed {
  companyCode            : Association to CompanyCodes @mandatory;
  purchasingOrganization : Association to PurchasingOrganizations @mandatory;
  status                 : String(20) default 'Active';
}
