# SAP CAP Purchase Order Management

A procurement management application built using **SAP Cloud Application Programming Model (CAP), Node.js, and PostgreSQL**. The project models the core purchase order process, including suppliers, company codes, purchasing organizations, materials, purchase order items, and supplier eligibility.

The goal is to build a backend with reliable procurement business rules and expose OData V4 APIs that can later be consumed by a custom SAP Fiori UI.

## Project Status

**Current development stage:** CAP backend development.

Implemented:
- SAP CAP service and CDS data model
- PostgreSQL database integration
- OData V4 endpoints for procurement entities
- Purchase orders with associated line items
- Automatic line total calculation on item creation and update
- Automatic purchase order total calculation after item creation and update

In progress:
- Supplier active-status validation
- Supplier authorization validation for the selected company code

Planned:
- Supplier–material eligibility validation
- Company–material eligibility validation
- Purchasing organization assignment validation
- Automatic total recalculation after item deletion or reassignment
- Purchase order approval workflow
- Custom SAP Fiori UI
- Automated tests and deployment

## Technology Stack

| Technology | Purpose |
|---|---|
| SAP CAP | Data modeling, services, and backend business logic |
| Node.js | JavaScript runtime |
| CDS | Domain model and service definitions |
| PostgreSQL | Relational database |
| OData V4 | API access to business entities |
| curl | API testing from the terminal |
| Git and GitHub | Version control |

## Architecture

```text
Terminal / Future SAP Fiori UI
              |
              v
        OData V4 APIs
              |
              v
      SAP CAP Service Layer
       purchase-service.cds
       purchase-service.js
              |
              v
        CDS Data Model
          db/schema.cds
              |
              v
          PostgreSQL
```

## Project Structure

```text
po-management/
├── db/
│   └── schema.cds
├── srv/
│   ├── purchase-service.cds
│   └── purchase-service.js
├── .gitignore
├── package.json
├── package-lock.json
└── readme.md
```

- `db/schema.cds` — defines the procurement data model and relationships.
- `srv/purchase-service.cds` — exposes the database entities through the `PurchaseService` OData service.
- `srv/purchase-service.js` — contains backend event handlers, calculations, and business validations.
- `package.json` — declares project dependencies and npm scripts.

## Business Entities

| Entity | Purpose |
|---|---|
| Suppliers | Supplier master data and status |
| CompanyCodes | Company code master data |
| PurchasingOrganizations | Purchasing organization master data |
| PurchasingGroups | Purchasing group master data |
| Materials | Material master data |
| PurchaseOrders | Purchase order header information |
| PurchaseOrderItems | Materials, quantities, unit prices, and line totals |
| ApprovalRequests | Purchase order approval records |
| SupplierCompanyAuthorizations | Supplier authorization for company codes |
| SupplierMaterials | Supplier–material relationships and prices |
| CompanyMaterials | Materials permitted for a company code |
| PurchasingOrgAssignments | Company code–purchasing organization assignments |

### Data relationships

- A supplier can have multiple purchase orders.
- A purchase order belongs to a supplier, company code, purchasing organization, and purchasing group.
- A purchase order can contain multiple purchase order items.
- Each purchase order item references a material.
- Supplier–company and supplier–material relationships are maintained using dedicated entities.

The model uses CAP's `cuid` and `managed` aspects where appropriate. These provide UUID-based IDs and standard audit fields.

## Implemented Business Logic

### 1. Automatic item total calculation

The CAP backend calculates the line total using quantity and unit price rather than relying on a client-provided total.

`Line Total = Quantity × Unit Price`

### 2. Automatic purchase order total

After an item is created or updated, the backend sums the line totals for the associated purchase order and updates its `totalAmount`.

`PO Total = Sum of all item line totals`

### Business Rules In Progress

#### Supplier status and company-code authorization

The intended rule is to allow a purchase order only when the selected supplier is active and has an active authorization record for the selected company code.

This validation is **not yet implemented and tested**.

### 1. Automatic item total calculation

The backend calculates the line total instead of trusting the value provided by the client.

```text
Line Total = Quantity × Unit Price
```

Example:

```text
Quantity  = 2
Unit Price = ₹65,000

Line Total = ₹130,000
```

### 2. Automatic purchase order total

The backend sums the line totals of the items belonging to a purchase order.

```text
PO Total = Sum of all item line totals
```

Example:

```text
Item 1 = ₹130,000
Item 2 =  ₹65,000

PO Total = ₹195,000
```

### 3. Supplier authorization

Before a purchase order is created or updated, the backend checks that:

- The supplier exists and is active.
- An active authorization exists for the selected supplier and company code.

Requests that fail these checks are rejected by the backend.

## Prerequisites

Install the following before running the project:

- Node.js and npm
- PostgreSQL
- SAP CAP development kit (`@sap/cds-dk`)
- Git

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/VAMSI-CHINTHA/sap-cap-po-management.git
cd sap-cap-po-management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure PostgreSQL

Create a local PostgreSQL database named `po_management_db`, or configure the project to use your existing database.

For example, if PostgreSQL is installed through Homebrew on macOS:

```bash
brew services start postgresql@16
createdb po_management_db
```

The `createdb` command is only needed if the database does not already exist.

Configure the CAP database connection using your local private configuration. Keep database credentials out of Git.

Do not commit `.cdsrc-private.json`, `.env`, passwords, or other secrets.

### 4. Deploy the data model

After configuring the database connection, deploy the CDS model:

```bash
npx cds deploy --to postgres
```

**Note:** Deploying a model to an existing database can change its schema. Use an appropriate development database and protect any data you need to retain.

### 5. Start the CAP server

```bash
npx cds watch
```

The local OData service should be available at:

```text
http://localhost:4004/odata/v4/purchase/
```

Open the service metadata in your browser:

```text
http://localhost:4004/odata/v4/purchase/$metadata
```

The following API examples assume that the server is running locally on port `4004` and that the required master data already exists.

# API Reference and curl Examples

All examples use the `PurchaseService` service root:

```bash
BASE_URL="http://localhost:4004/odata/v4/purchase"
```

Run this assignment in the same terminal before using the examples below. These examples use standard OData V4 HTTP operations.

## 1. Read data

### Get all suppliers

```bash
curl -s "$BASE_URL/Suppliers"
```

### Get all company codes

```bash
curl -s "$BASE_URL/CompanyCodes"
```

### Get all materials

```bash
curl -s "$BASE_URL/Materials"
```

### Get all purchasing organizations

```bash
curl -s "$BASE_URL/PurchasingOrganizations"
```

### Get all purchase orders

```bash
curl -s "$BASE_URL/PurchaseOrders"
```

### Get purchase orders with their items

```bash
curl -s -G "$BASE_URL/PurchaseOrders" \
  --data-urlencode '$expand=items'
```

### Get purchase orders with supplier and item details

```bash
curl -s -G "$BASE_URL/PurchaseOrders" \
  --data-urlencode '$expand=supplier,items'
```

### Get one purchase order by UUID

Replace the UUID with an existing purchase order ID.

```bash
curl -s "$BASE_URL/PurchaseOrders/9fd37b4f-1675-4c34-8d89-6e1b551393b2"
```

### Filter purchase orders by PO number

```bash
curl -s -G "$BASE_URL/PurchaseOrders" \
  --data-urlencode "\$filter=poNumber eq 'PO2026002'"
```

### Select only the PO number and total

```bash
curl -s -G "$BASE_URL/PurchaseOrders" \
  --data-urlencode "\$filter=poNumber eq 'PO2026002'" \
  --data-urlencode '$select=poNumber,totalAmount,currency'
```

## 2. Create master data

CAP generates IDs for entities using the `cuid` aspect. When creating a record, omit the `ID` unless you specifically need to supply one.

### Create a supplier

```bash
curl -i -X POST "$BASE_URL/Suppliers" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierNumber": "SUP002",
    "name": "Example Supplier",
    "city": "Bengaluru",
    "contact": "Ravi Kumar",
    "email": "supplier@example.com",
    "phone": "9876543210",
    "address": "Whitefield, Bengaluru",
    "status": "Active"
  }'
```

### Create a company code

```bash
curl -i -X POST "$BASE_URL/CompanyCodes" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "IN02",
    "description": "Example India Company"
  }'
```

### Create a purchasing organization

```bash
curl -i -X POST "$BASE_URL/PurchasingOrganizations" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PO02",
    "description": "Example Procurement"
  }'
```

### Create a purchasing group

```bash
curl -i -X POST "$BASE_URL/PurchasingGroups" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "IT02",
    "description": "Example IT Procurement Team"
  }'
```

### Create a material

```bash
curl -i -X POST "$BASE_URL/Materials" \
  -H "Content-Type: application/json" \
  -d '{
    "materialNumber": "MON001",
    "description": "Business Monitor",
    "unit": "EA"
  }'
```

**Important:** Save the generated IDs returned by these requests. Relationships in subsequent requests must use the corresponding UUIDs, not business codes or names.

## 3. Configure supplier authorization

To create a purchase order, the supplier must be active and authorized for the chosen company code.

### Read existing authorization records

```bash
curl -s "$BASE_URL/SupplierCompanyAuthorizations"
```

### Create an authorization record

Replace both UUIDs with existing supplier and company code IDs.

```bash
curl -i -X POST "$BASE_URL/SupplierCompanyAuthorizations" \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_ID": "SUPPLIER_UUID",
    "companyCode_ID": "COMPANY_CODE_UUID",
    "status": "Active"
  }'
```

`SUPPLIER_UUID` and `COMPANY_CODE_UUID` are placeholders, not literal IDs. Use UUIDs returned by your API.

## 4. Create a purchase order

The supplier, company code, purchasing organization, and purchasing group must already exist. The supplier must also be active and authorized for the selected company code.

```bash
curl -i -X POST "$BASE_URL/PurchaseOrders" \
  -H "Content-Type: application/json" \
  -d '{
    "poNumber": "PO20261001",
    "supplier_ID": "SUPPLIER_UUID",
    "companyCode_ID": "COMPANY_CODE_UUID",
    "purchasingOrganization_ID": "PURCHASING_ORG_UUID",
    "purchasingGroup_ID": "PURCHASING_GROUP_UUID",
    "documentDate": "2026-10-15",
    "deliveryDate": "2026-11-15",
    "purchaseOrderType": "NB",
    "currency": "INR",
    "paymentTerms": "NET30",
    "status": "Draft"
  }'
```

Replace all four placeholder IDs with valid IDs from your database. Use a unique PO number each time.

## 5. Create a purchase order item

Replace `PURCHASE_ORDER_UUID` and `MATERIAL_UUID` with actual IDs.

Notice that the request includes quantity and unit price. The backend calculates `lineTotal`.

```bash
curl -i -X POST "$BASE_URL/PurchaseOrderItems" \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseOrder_ID": "PURCHASE_ORDER_UUID",
    "material_ID": "MATERIAL_UUID",
    "description": "Business Monitor",
    "quantity": 2,
    "unit": "EA",
    "unitPrice": 15000
  }'
```

The expected line total is:

```text
2 × 15000 = 30000.00
```

The backend also updates the parent purchase order's `totalAmount` after the item is saved.

## 6. Update records

OData V4 uses `PATCH` for partial updates. Replace the UUIDs with actual record IDs.

### Update supplier information

```bash
curl -i -X PATCH \
  "$BASE_URL/Suppliers/SUPPLIER_UUID" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Hyderabad",
    "contact": "New Contact"
  }'
```

### Update a purchase order header

```bash
curl -i -X PATCH \
  "$BASE_URL/PurchaseOrders/PURCHASE_ORDER_UUID" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentTerms": "NET45",
    "reference": "Updated reference"
  }'
```

The supplier authorization validation also runs for purchase order updates.

### Update an item quantity

```bash
curl -i -X PATCH \
  "$BASE_URL/PurchaseOrderItems/PURCHASE_ORDER_ITEM_UUID" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'
```

The backend should recalculate the item's `lineTotal` using its updated quantity and existing unit price, then recalculate the purchase order total.

### Update an item price

```bash
curl -i -X PATCH \
  "$BASE_URL/PurchaseOrderItems/PURCHASE_ORDER_ITEM_UUID" \
  -H "Content-Type: application/json" \
  -d '{
    "unitPrice": 18000
  }'
```

The client does not need to supply `lineTotal`. The backend derives it from the quantity and unit price.

## 7. Delete records

**Warning:** These commands permanently delete records if the service permits the operation. Use test records, not purchase orders you need to retain.

### Delete a purchase order item

```bash
curl -i -X DELETE \
  "$BASE_URL/PurchaseOrderItems/PURCHASE_ORDER_ITEM_UUID"
```

### Delete a test supplier

```bash
curl -i -X DELETE \
  "$BASE_URL/Suppliers/SUPPLIER_UUID"
```

A delete may fail if the record is referenced by other entities or if database constraints prevent it. Item deletion and automatic PO total recalculation after deletion are not implemented yet.

## 8. Test validation rules

### Test an unauthorized supplier/company combination

Create a purchase order using an existing active supplier and a company code for which the supplier has no active authorization.

Expected: the backend rejects the request with HTTP `400`.

### Test a non-positive item quantity

```bash
curl -i -X POST "$BASE_URL/PurchaseOrderItems" \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseOrder_ID": "PURCHASE_ORDER_UUID",
    "material_ID": "MATERIAL_UUID",
    "description": "Invalid test item",
    "quantity": 0,
    "unit": "EA",
    "unitPrice": 100
  }'
```

Expected: the backend rejects the request because quantity must be greater than zero.

Use valid existing UUIDs for the parent PO and material so the quantity validation is what you're testing.

## Development Notes

- The application currently exposes OData V4 endpoints through SAP CAP.
- Entity relationships are defined in CDS rather than manually managing foreign-key columns.
- Purchase order items use a composition relationship with their purchase order.
- Backend calculations should be treated as authoritative; client-provided totals should not be trusted.
- Use a separate development database for testing destructive operations.

## Security

- Never commit database passwords, API keys, tokens, or private configuration files.
- Keep `.cdsrc-private.json` and `.env` excluded through `.gitignore`.
- Use environment-specific configuration for deployment.
- Do not expose a development database directly to the public internet.

## Future Enhancements

1. Validate supplier–material eligibility.
2. Validate company–material eligibility.
3. Validate company code–purchasing organization assignments.
4. Recalculate PO totals after item deletion or reassignment.
5. Add approval submission, approval, and rejection workflows.
6. Build a custom SAP Fiori UI.
7. Add automated tests for validations and calculations.
8. Add deployment documentation and CI/CD.

## Repository

GitHub: https://github.com/VAMSI-CHINTHA/sap-cap-po-management

---

**Project objective:** Build a procurement application using SAP CAP with reliable server-side business logic and an OData API that can support an enterprise-style SAP Fiori experience.