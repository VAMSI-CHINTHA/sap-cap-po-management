
const cds = require('@sap/cds');

module.exports = function () {
  const {
    PurchaseOrderItems,
    PurchaseOrders,
    Suppliers,
    Materials,
    SupplierCompanyAuthorizations,
    PurchasingOrganizations,
    PurchasingOrgAssignments,
    SupplierMaterials,
    CompanyMaterials,
    ApprovalRequests
  } = this.entities;

  // Helper: identify the record being updated.
  function getRecordID(req) {
    const key = req.params?.[0];

    return (
      req.data.ID ||
      (typeof key === 'string' ? key : key?.ID)
    );
  }

  // Check whether a purchase order can be modified.
  async function ensurePurchaseOrderEditable(poID, req) {
    if (!poID) {
      return req.reject(
        400,
        'Unable to identify the purchase order'
      );
    }

    const purchaseOrder = await SELECT.one
      .from(PurchaseOrders)
      .columns('ID', 'status')
      .where({ ID: poID });

    if (!purchaseOrder) {
      return req.reject(404, 'Purchase order not found');
    }

    if (!['Draft', 'Rejected'].includes(purchaseOrder.status)) {
      return req.reject(
        400,
        `Purchase order cannot be modified when its status is '${purchaseOrder.status}'`
      );
    }

    return purchaseOrder;
  }

  // Helper: validate supplier and company authorization.
  async function validateSupplier(supplierID, companyCodeID, req) {
    if (!supplierID || !companyCodeID) {
      return req.reject(
        400,
        'Supplier and company code are required'
      );
    }

    const supplier = await SELECT.one
      .from(Suppliers)
      .columns('ID', 'status')
      .where({ ID: supplierID });

    if (!supplier) {
      return req.reject(400, 'Selected supplier does not exist');
    }

    if (supplier.status !== 'Active') {
      return req.reject(
        400,
        'Only active suppliers can be used in purchase orders'
      );
    }

    const authorization = await SELECT.one
      .from(SupplierCompanyAuthorizations)
      .columns('ID')
      .where({
        supplier_ID: supplierID,
        companyCode_ID: companyCodeID,
        status: 'Active'
      });

    if (!authorization) {
      return req.reject(
        400,
        'Supplier is not authorized for the selected company code'
      );
    }
  }

  // Helper: validate purchasing organization assignment.
  async function validatePurchasingOrganization(
    purchasingOrganizationID,
    companyCodeID,
    req
  ) {
    if (!purchasingOrganizationID || !companyCodeID) {
      return req.reject(
        400,
        'Purchasing organization and company code are required'
      );
    }

    const purchaseOrg = await SELECT.one
      .from(PurchasingOrganizations)
      .columns('ID')
      .where({ ID: purchasingOrganizationID });

    if (!purchaseOrg) {
      return req.reject(
        400,
        'Selected purchasing organization does not exist'
      );
    }

    const assignment = await SELECT.one
      .from(PurchasingOrgAssignments)
      .columns('ID')
      .where({
        purchasingOrganization_ID: purchasingOrganizationID,
        companyCode_ID: companyCodeID,
        status: 'Active'
      });

    if (!assignment) {
      return req.reject(
        400,
        'Purchasing organization is not assigned to the selected company code'
      );
    }
  }

  // Reusable validation and pricing logic for purchase order items.
  async function preparePurchaseOrderItem(
    item,
    purchaseOrder,
    req,
    existingItem = null
  ) {
    const materialID = item.material_ID ??
      existingItem?.material_ID;

    const quantity = item.quantity ??
      existingItem?.quantity;

    if (!materialID) {
      return req.reject(400, 'Material is required');
    }

    // Validate that the material exists.
    const material = await SELECT.one
      .from(Materials)
      .columns('ID')
      .where({ ID: materialID });

    if (!material) {
      return req.reject(400, 'Selected material does not exist');
    }

    // Validate supplier-material relationship and retrieve agreed price.
    const supplierMaterial = await SELECT.one
      .from(SupplierMaterials)
      .columns('ID', 'unitPrice', 'currency')
      .where({
        supplier_ID: purchaseOrder.supplier_ID,
        material_ID: materialID,
        status: 'Active'
      });

    if (!supplierMaterial) {
      return req.reject(
        400,
        'Supplier is not authorized to provide the selected material'
      );
    }

    if (
      supplierMaterial.unitPrice == null ||
      !Number.isFinite(Number(supplierMaterial.unitPrice)) ||
      Number(supplierMaterial.unitPrice) < 0
    ) {
      return req.reject(
        400,
        'The agreed supplier price is missing or invalid'
      );
    }

    // Validate currency.
    if (
      supplierMaterial.currency &&
      purchaseOrder.currency &&
      supplierMaterial.currency !== purchaseOrder.currency
    ) {
      return req.reject(
        400,
        'Supplier price currency does not match purchase order currency'
      );
    }

    // Validate company-material relationship.
    const companyMaterial = await SELECT.one
      .from(CompanyMaterials)
      .columns('ID')
      .where({
        companyCode_ID: purchaseOrder.companyCode_ID,
        material_ID: materialID,
        status: 'Active'
      });

    if (!companyMaterial) {
      return req.reject(
        400,
        'Material is not authorized for the selected company code'
      );
    }

    // Validate quantity.
    if (
      quantity == null ||
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return req.reject(400, 'Quantity must be greater than zero');
    }

    // Preserve the original agreed-price snapshot on quantity-only updates.
    const materialChanged =
      existingItem &&
      materialID !== existingItem.material_ID;

    item.unitPrice =
      !existingItem || materialChanged
        ? supplierMaterial.unitPrice
        : existingItem.unitPrice;

    item.lineTotal = Number(
      (Number(quantity) * Number(item.unitPrice)).toFixed(2)
    );
  }


  // BUSINESS RULES 1–3:
  // Validate supplier, supplier-company authorization,
  // and purchasing organization for every purchase order.
  this.before(
    ['CREATE', 'UPDATE'],
    'PurchaseOrders',
    async (req) => {
      const data = req.data;

      let supplierID = data.supplier_ID;
      let companyCodeID = data.companyCode_ID;
      let purchasingOrganizationID =
        data.purchasingOrganization_ID;

      // On UPDATE, retain existing values for omitted fields.
      if (req.event === 'UPDATE') {
        const poID = getRecordID(req);

        // Prevent editing POs that are under approval or already approved.
        await ensurePurchaseOrderEditable(poID, req);

        if (!poID) {
          return req.reject(
            400,
            'Unable to identify the purchase order'
          );
        }

        const existingPO = await SELECT.one
          .from(PurchaseOrders)
          .columns(
            'supplier_ID',
            'companyCode_ID',
            'purchasingOrganization_ID'
          )
          .where({ ID: poID });

        if (!existingPO) {
          return req.reject(404, 'Purchase order not found');
        }

        if (supplierID === undefined) {
          supplierID = existingPO.supplier_ID;
        }

        if (companyCodeID === undefined) {
          companyCodeID = existingPO.companyCode_ID;
        }

        if (purchasingOrganizationID === undefined) {
          purchasingOrganizationID =
            existingPO.purchasingOrganization_ID;
        }
      }

      if (
        !supplierID ||
        !companyCodeID ||
        !purchasingOrganizationID
      ) {
        return req.reject(
          400,
          'Supplier, company code and purchasing organization are required'
        );
      }

      await validateSupplier(
        supplierID,
        companyCodeID,
        req
      );

      await validatePurchasingOrganization(
        purchasingOrganizationID,
        companyCodeID,
        req
      );

      // Process nested items during PO creation.
      if (req.event === 'CREATE' && data.items?.length) {
        const purchaseOrderData = {
          supplier_ID: supplierID,
          companyCode_ID: companyCodeID,
          purchasingOrganization_ID: purchasingOrganizationID,
          currency: data.currency
        };

        let totalAmount = 0;

        for (const item of data.items) {
          await preparePurchaseOrderItem(
            item,
            purchaseOrderData,
            req
          );

          totalAmount += Number(item.lineTotal);
        }

        data.totalAmount = Number(totalAmount.toFixed(2));
      }
    }
  );

  
  // BUSINESS RULES 4–7:
  // Validate each item and retrieve its agreed supplier price.
  this.before(
    ['CREATE', 'UPDATE'],
    'PurchaseOrderItems',
    async (req) => {
      const data = req.data;

      let quantity = data.quantity;
      let materialID = data.material_ID;
      let purchaseOrderID = data.purchaseOrder_ID;

      let existingItem = null;

      // On UPDATE, load existing values when omitted.
      if (req.event === 'UPDATE') {
        const itemID = getRecordID(req);

        if (!itemID) {
          return req.reject(
            400,
            'Unable to identify the purchase order item'
          );
        }

        existingItem = await SELECT.one
          .from(PurchaseOrderItems)
          .columns(
            'quantity',
            'unitPrice',
            'material_ID',
            'purchaseOrder_ID'
          )
          .where({ ID: itemID });

        if (!existingItem) {
          return req.reject(
            404,
            'Purchase order item not found'
          );
        }

        if (quantity === undefined) {
          quantity = existingItem.quantity;
        }

        if (materialID === undefined) {
          materialID = existingItem.material_ID;
        }

        if (purchaseOrderID === undefined) {
          purchaseOrderID = existingItem.purchaseOrder_ID;
        }

        // Remember the old parent if the item is moved.
        req._previousPurchaseOrderID =
          existingItem.purchaseOrder_ID;
      }

      // Purchase order items cannot be moved between purchase orders.
      if (
        purchaseOrderID !== existingItem.purchaseOrder_ID
      ) {
        return req.reject(
          400,
          'Purchase order items cannot be moved between purchase orders'
        );
      }

      if (!purchaseOrderID || !materialID) {
        return req.reject(
          400,
          'Purchase order and material are required for each item'
        );
      }

      // Load the parent purchase order.
      const purchaseOrder = await SELECT.one
        .from(PurchaseOrders)
        .columns(
          'ID',
          'supplier_ID',
          'companyCode_ID',
          'purchasingOrganization_ID',
          'currency'
        )
        .where({ ID: purchaseOrderID });

      if (!purchaseOrder) {
        return req.reject(
          400,
          'The selected purchase order does not exist'
        );
      }

      // Prevent adding or modifying items on locked purchase orders.
      await ensurePurchaseOrderEditable(purchaseOrderID, req);

      // Revalidate the parent references.
      await validateSupplier(
        purchaseOrder.supplier_ID,
        purchaseOrder.companyCode_ID,
        req
      );

      await validatePurchasingOrganization(
        purchaseOrder.purchasingOrganization_ID,
        purchaseOrder.companyCode_ID,
        req
      );

      // Apply reusable validation and pricing logic.
      await preparePurchaseOrderItem(
        data,
        purchaseOrder,
        req,
        existingItem
      );
    }
  );


  // BUSINESS RULE 8:
  // Recalculate purchase order totals after item changes.
  this.after(
    ['CREATE', 'UPDATE'],
    'PurchaseOrderItems',
    async (result, req) => {
      const itemID = result?.ID || getRecordID(req);

      let currentPurchaseOrderID =
        result?.purchaseOrder_ID ||
        req.data.purchaseOrder_ID;

      // If the parent wasn't in the request, look it up.
      if (!currentPurchaseOrderID && itemID) {
        const item = await SELECT.one
          .from(PurchaseOrderItems)
          .columns('purchaseOrder_ID')
          .where({ ID: itemID });

        currentPurchaseOrderID = item?.purchaseOrder_ID;
      }

      // Recalculate the current and, if applicable, old parent.
      const purchaseOrderIDs = [
        currentPurchaseOrderID,
        req._previousPurchaseOrderID
      ].filter(
        (id, index, ids) => id && ids.indexOf(id) === index
      );

      for (const purchaseOrderID of purchaseOrderIDs) {
        const items = await SELECT.from(PurchaseOrderItems)
          .columns('lineTotal')
          .where({ purchaseOrder_ID: purchaseOrderID });

        const total = items.reduce(
          (sum, item) => sum + Number(item.lineTotal || 0),
          0
        );

        await UPDATE(PurchaseOrders)
          .set({ totalAmount: Number(total.toFixed(2)) })
          .where({ ID: purchaseOrderID });
      }
    }
  );


  // Capture the parent purchase order before the item is deleted.
  this.before(
    'DELETE',
    'PurchaseOrderItems',
    async (req) => {
      const itemID = getRecordID(req);

      if (!itemID) {
        return req.reject(
          400,
          'Unable to identify the purchase order item'
        );
      }

      const item = await SELECT.one
        .from(PurchaseOrderItems)
        .columns('purchaseOrder_ID')
        .where({ ID: itemID });

      if (!item) {
        return req.reject(
          404,
          'Purchase order item not found'
        );
      }

      // Prevent deleting items from locked purchase orders.
      await ensurePurchaseOrderEditable(
        item.purchaseOrder_ID,
        req
      );

      // Save the parent ID for the after-delete handler.
      req._deletedItemPurchaseOrderID = item.purchaseOrder_ID;
    }
  );

  // Recalculate the parent total after the item is deleted.
  this.after(
    'DELETE',
    'PurchaseOrderItems',
    async (result, req) => {
      const purchaseOrderID =
        req._deletedItemPurchaseOrderID;

      if (!purchaseOrderID) return;

      const remainingItems = await SELECT.from(PurchaseOrderItems)
        .columns('lineTotal')
        .where({ purchaseOrder_ID: purchaseOrderID });

      const total = remainingItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
      );

      await UPDATE(PurchaseOrders)
        .set({ totalAmount: Number(total.toFixed(2)) })
        .where({ ID: purchaseOrderID });
    }
  );


  // APPROVAL WORKFLOW:
  // Submit a purchase order for approval.
  this.on(
    'submitForApproval',
    'PurchaseOrders',
    async (req) => {
      const poID = req.params?.[0]?.ID;

      // 1. Identify the purchase order.
      if (!poID) {
        return req.reject(
          400,
          'Unable to identify the purchase order'
        );
      }

      // // 2. Retrieve the purchase order.
      // const purchaseOrder = await SELECT.one
      //   .from(PurchaseOrders)
      //   .where({ ID: poID });

      const purchaseOrder = await SELECT.one
      .from(PurchaseOrders)
      .where({ ID: poID })
      .forUpdate();

      if (!purchaseOrder) {
        return req.reject(
          404,
          'Purchase order not found'
        );
      }

      // 3. Only Draft or Rejected POs can be submitted.
      if (
        !['Draft', 'Rejected'].includes(
          purchaseOrder.status
        )
      ) {
        return req.reject(
          400,
          'Only Draft or Rejected purchase orders can be submitted'
        );
      }

      // 4. A PO must contain at least one item.
      const firstItem = await SELECT.one
        .from(PurchaseOrderItems)
        .columns('ID')
        .where({ purchaseOrder_ID: poID });

      if (!firstItem) {
        return req.reject(
          400,
          'A purchase order must contain at least one item'
        );
      }

      // 5. Validate the server-calculated PO total.
      const totalAmount = Number(
        purchaseOrder.totalAmount || 0
      );

      if (
        !Number.isFinite(totalAmount) ||
        totalAmount <= 0
      ) {
        return req.reject(
          400,
          'Purchase order total must be greater than zero'
        );
      }

      // 6. Determine the next approval cycle.
      const previousApprovals = await SELECT
        .from(ApprovalRequests)
        .columns('approvalCycle')
        .where({ purchaseOrder_ID: poID });

      const previousCycle = previousApprovals.reduce(
        (maximum, approval) =>
          Math.max(maximum, Number(approval.approvalCycle || 0)),
        0
      );

      const approvalCycle = previousCycle + 1;

      // 7. Determine the required approval levels.
      const approvalEntries = [
        {
          purchaseOrder_ID: poID,
          approvalLevel: 1,
          approverRole: 'Manager',
          approvalCycle,
          decision: 'Pending'
        }
      ];

      // Finance approval is required above ₹1,00,000.
      if (totalAmount > 100000) {
        approvalEntries.push({
          purchaseOrder_ID: poID,
          approvalLevel: 2,
          approverRole: 'Finance',
          approvalCycle,
          decision: 'Pending'
        });
      }

      // 8. Create approval records.
      await INSERT
        .into(ApprovalRequests)
        .entries(approvalEntries);

      // 9. Change the PO status.
      await UPDATE(PurchaseOrders)
        .set({
          status: 'Pending Approval'
        })
        .where({ ID: poID });

      return `Purchase order submitted successfully. Required approval levels: ${approvalEntries.length}`;
    }
  );


  // APPROVAL WORKFLOW:
  // Approve the next pending approval level.
  this.on(
    'approvePurchaseOrder',
    'PurchaseOrders',
    async (req) => {
      const poID = getRecordID(req);
      const comments = req.data.comments;

      if (!poID) {
        return req.reject(400, 'Unable to identify purchase order');
      }

      // 1. Retrieve the purchase order.
      const purchaseOrder = await SELECT.one
        .from(PurchaseOrders)
        .where({ ID: poID }).forUpdate();

      if (!purchaseOrder) {
        return req.reject(404, 'Purchase order not found');
      }

      if (purchaseOrder.status !== 'Pending Approval') {
        return req.reject(
          400,
          'Purchase order is not pending approval'
        );
      }

      // 2. Find the latest approval cycle.
      const allApprovals = await SELECT
        .from(ApprovalRequests)
        .where({ purchaseOrder_ID: poID });

      const currentCycle = allApprovals.reduce(
        (maximum, approval) =>
          Math.max(maximum, Number(approval.approvalCycle || 0)),
        0
      );

      const currentApprovals = allApprovals
        .filter(
          approval =>
            Number(approval.approvalCycle) === currentCycle
        )
        .sort(
          (a, b) => a.approvalLevel - b.approvalLevel
        );

      if (currentApprovals.length === 0) {
        return req.reject(
          400,
          'No approval records found for the current cycle'
        );
      }

      // 3. Find the next pending approval.
      const nextApproval = currentApprovals.find(
        approval => approval.decision === 'Pending'
      );

      if (!nextApproval) {
        return req.reject(
          400,
          'No pending approval is available'
        );
      }

      // 4. Ensure previous approval levels are completed.
      const previousApprovals = currentApprovals.filter(
        approval =>
          approval.approvalLevel < nextApproval.approvalLevel
      );

      const previousLevelNotApproved = previousApprovals.some(
        approval => approval.decision !== 'Approved'
      );

      if (previousLevelNotApproved) {
        return req.reject(
          400,
          'Previous approval levels must be approved first'
        );
      }

      // 5. Record the approval decision.
      await UPDATE(ApprovalRequests)
        .set({
          decision: 'Approved',
          comments: comments || null,
          decidedAt: new Date()
        })
        .where({ ID: nextApproval.ID });

      // 6. Check whether more approvals are pending.
      const moreApprovalsPending = currentApprovals.some(
        approval =>
          approval.ID !== nextApproval.ID &&
          approval.decision === 'Pending'
      );

      // 7. Complete the PO if all approvals are finished.
      if (!moreApprovalsPending) {
        await UPDATE(PurchaseOrders)
          .set({ status: 'Approved' })
          .where({ ID: poID });

        return 'All required approvals completed. Purchase order approved.';
      }

      return `${nextApproval.approverRole} approval completed. Waiting for the next approval level.`;
    }
  );


  // APPROVAL WORKFLOW:
  // Reject the next pending approval level.
  this.on(
    'rejectPurchaseOrder',
    'PurchaseOrders',
    async (req) => {
      const poID = getRecordID(req);
      const comments = req.data.comments;

      if (!poID) {
        return req.reject(400, 'Unable to identify purchase order');
      }

      if (!comments || !comments.trim()) {
        return req.reject(
          400,
          'Comments are required when rejecting a purchase order'
        );
      }

      const purchaseOrder = await SELECT.one
        .from(PurchaseOrders)
        .where({ ID: poID }).forUpdate();

      if (!purchaseOrder) {
        return req.reject(404, 'Purchase order not found');
      }

      if (purchaseOrder.status !== 'Pending Approval') {
        return req.reject(
          400,
          'Purchase order is not pending approval'
        );
      }

      // Find the latest approval cycle.
      const allApprovals = await SELECT
        .from(ApprovalRequests)
        .where({ purchaseOrder_ID: poID });

      const currentCycle = allApprovals.reduce(
        (maximum, approval) =>
          Math.max(maximum, Number(approval.approvalCycle || 0)),
        0
      );

      const currentApprovals = allApprovals
        .filter(
          approval =>
            Number(approval.approvalCycle) === currentCycle
        )
        .sort(
          (a, b) => a.approvalLevel - b.approvalLevel
        );

      const nextApproval = currentApprovals.find(
        approval => approval.decision === 'Pending'
      );

      if (!nextApproval) {
        return req.reject(
          400,
          'No pending approval is available'
        );
      }

      const previousLevelNotApproved = currentApprovals.some(
        approval =>
          approval.approvalLevel < nextApproval.approvalLevel &&
          approval.decision !== 'Approved'
      );

      if (previousLevelNotApproved) {
        return req.reject(
          400,
          'Previous approval levels must be approved first'
        );
      }

      // Record rejection.
      await UPDATE(ApprovalRequests)
        .set({
          decision: 'Rejected',
          comments,
          decidedAt: new Date()
        })
        .where({ ID: nextApproval.ID });

        // Cancel all remaining pending approvals in this cycle.
      await UPDATE(ApprovalRequests)
        .set({ 
          decision: 'Cancelled',
          decidedAt: new Date()
         })
        .where({
          purchaseOrder_ID: poID,
          approvalCycle: currentCycle,
          decision: 'Pending'
        });

      // Stop the approval workflow.
      await UPDATE(PurchaseOrders)
        .set({ status: 'Rejected' })
        .where({ ID: poID });

      return `${nextApproval.approverRole} rejected the purchase order.`;
    }
  );



};
