Sure. Below is the complete SAP CAP Purchase Order Approval Workflow – cURL Testing Checklist based on the implementation and tests we've completed.

You can save these commands in a text file and reuse them whenever you need to test the backend.

# 1. Test data

These are the IDs we've used in our testing.

```
# Base URL
http://localhost:4004/odata/v4/purchase

# Supplier: Tech Solutions
ac6b00a4-5618-4888-adff-bb40eadce078

# Company Code: IN02
10116124-c9df-483a-bd61-217b0c34da2e

# Purchasing Organization: PO02
833da113-f793-419e-9d3a-80e9d7b5b090

# Purchasing Group: IT02
b8115c43-9385-474b-bb24-9bfce59500cb

# Material: KEY001
1c1f1f86-a8a5-48f4-8889-cb93c62c8e51
```

# 2. Create purchase orders

## Scenario A: Low-value PO — ₹75,000

Expected: Manager approval only.

```
curl -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders" \
  -H "Content-Type: application/json" \
  -d '{
    "poNumber": "PO-LOW-TEST-001",
    "documentDate": "2026-10-31",
    "supplier_ID": "ac6b00a4-5618-4888-adff-bb40eadce078",
    "companyCode_ID": "10116124-c9df-483a-bd61-217b0c34da2e",
    "purchasingOrganization_ID": "833da113-f793-419e-9d3a-80e9d7b5b090",
    "purchasingGroup_ID": "b8115c43-9385-474b-bb24-9bfce59500cb",
    "currency": "INR",
    "items": [
      {
        "material_ID": "1c1f1f86-a8a5-48f4-8889-cb93c62c8e51",
        "quantity": 50,
        "unit": "EA"
      }
    ]
  }'
```

Expected total: ₹75,000.

## Scenario B: High-value PO — ₹1,50,000

Expected: Manager + Finance approval.

```
curl -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders" \
  -H "Content-Type: application/json" \
  -d '{
    "poNumber": "PO-HIGH-TEST-001",
    "documentDate": "2026-10-31",
    "supplier_ID": "ac6b00a4-5618-4888-adff-bb40eadce078",
    "companyCode_ID": "10116124-c9df-483a-bd61-217b0c34da2e",
    "purchasingOrganization_ID": "833da113-f793-419e-9d3a-80e9d7b5b090",
    "purchasingGroup_ID": "b8115c43-9385-474b-bb24-9bfce59500cb",
    "currency": "INR",
    "items": [
      {
        "material_ID": "1c1f1f86-a8a5-48f4-8889-cb93c62c8e51",
        "quantity": 100,
        "unit": "EA"
      }
    ]
  }'
```

Expected total: ₹1,50,000.

Important: Save the `ID` returned by each POST. You'll need it in the following commands.

# 3. Submit purchase order for approval

Replace `PO_ID` with the ID returned during creation.

```
curl -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)/PurchaseService.submitForApproval" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected:

- Low-value: 1 approval level.
- High-value: 2 approval levels.
- PO status: `Pending Approval`.

# 4. Approve purchase orders

## Manager approval

```
curl -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)/PurchaseService.approvePurchaseOrder" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Approved by Manager"
  }'
```

For low-value POs, this should complete the workflow and set the PO to `Approved`.

For high-value POs, the response should indicate that Finance approval is pending.

## Finance approval

After Manager approval, call the same action again:

```
curl -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)/PurchaseService.approvePurchaseOrder" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Approved by Finance"
  }'
```

Expected final PO status: `Approved`.

# 5. Reject purchase orders

## Manager rejection

```
curl -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)/PurchaseService.rejectPurchaseOrder" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Rejected by Manager - budget justification required"
  }'
```

Expected:

| Record  | Decision  |
| ------- | --------- |
| Manager | Rejected  |
| Finance | Cancelled |
| PO      | Rejected  |

## Finance rejection

First, Manager must approve the PO.

Then execute:

```
curl -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)/PurchaseService.rejectPurchaseOrder" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Rejected by Finance - budget limit exceeded"
  }'
```

Expected:

| Record  | Decision |
| ------- | -------- |
| Manager | Approved |
| Finance | Rejected |
| PO      | Rejected |

# 6. Resubmit rejected purchase orders

## Step 1: Edit rejected PO

```
curl -X PATCH \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Revised budget justification - resubmission"
  }'
```

Expected: PO remains `Rejected`.

## Step 2: Submit again

```
curl -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)/PurchaseService.submitForApproval" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: Cycle 2 is created.

For a high-value PO:

| Cycle | Manager  | Finance  |
| ----- | -------- | -------- |
| 1     | Approved | Rejected |
| 2     | Pending  | Pending  |

The old records must remain unchanged.

# 7. Negative testing

These tests verify that invalid operations are rejected.

## Test A: Submit an already Approved PO

```
curl -i -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)/PurchaseService.submitForApproval" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected HTTP 400:

`Only Draft or Rejected purchase orders can be submitted`

## Test B: Reject without comments

```
curl -i -X POST \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)/PurchaseService.rejectPurchaseOrder" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": ""
  }'
```

Expected: HTTP 400.

Run this against a currently Pending Approval PO with a pending approval record.

# 8. Verify purchase order status

```
curl -s \
  "http://localhost:4004/odata/v4/purchase/PurchaseOrders(PO_ID)?\$select=poNumber,status,totalAmount"
```

Possible statuses:

- Draft
- Pending Approval
- Approved
- Rejected

# 9. Verify approval history

Get all approval records:

```
curl -s \
  "http://localhost:4004/odata/v4/purchase/ApprovalRequests"
```

This returns the approval history, including:

- Approver role
- Approval level
- Approval cycle
- Decision
- Comments
- Decision timestamp
- Purchase order ID

# 10. Overall test checklist

Approval workflow testing

# 14/15

Create low-value PO

Create high-value PO

Submit low-value PO

Manager approves low-value PO

Submit high-value PO

Manager approves high-value PO

Finance approves high-value PO

Manager rejects high-value PO

Verify Finance gets Cancelled

Finance rejects high-value PO

Resubmit rejected PO

Verify Cycle 1 history preserved

Verify Cycle 2 created

Try resubmitting Approved PO

Reject without comments

One important note: These commands test your current local backend logic. Authentication and role-based authorization are not implemented yet, so they do not prove that only actual Managers or Finance users can approve or reject POs.

Also, the PO editing restrictions for Pending Approval and Approved statuses are still pending implementation. We should implement and test those separately before treating the workflow as complete.

My recommendation: keep this as your Approval Workflow API Test Suite in your project documentation.