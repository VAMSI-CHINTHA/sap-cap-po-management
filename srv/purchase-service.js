
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
    CompanyMaterials
  } = this.entities;

  // Helper: identify the record being updated.
  function getRecordID(req) {
    const key = req.params?.[0];

    return (
      req.data.ID ||
      (typeof key === 'string' ? key : key?.ID)
    );
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

      // Check that the material exists.
      const material = await SELECT.one
        .from(Materials)
        .columns('ID')
        .where({ ID: materialID });

      if (!material) {
        return req.reject(
          400,
          'Selected material does not exist'
        );
      }

      // Find the previously agreed price for this supplier
      // and material.
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

      // Validate the agreed price stored in the supplier catalog.
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

      // Ensure the supplier price uses the PO currency.
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

      // The material must be allowed for this company code.
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

      // Quantity must be greater than zero.
      if (
        quantity == null ||
        !Number.isFinite(Number(quantity)) ||
        Number(quantity) <= 0
      ) {
        return req.reject(
          400,
          'Quantity must be greater than zero'
        );
      }

      // Use the agreed supplier price on CREATE or when the
      // material changes. Otherwise, preserve the saved price
      // snapshot for quantity-only updates.
      const materialChanged =
        existingItem &&
        materialID !== existingItem.material_ID;

      if (!existingItem || materialChanged) {
        data.unitPrice = supplierMaterial.unitPrice;
      } else {
        data.unitPrice = existingItem.unitPrice;
      }

      // Always calculate the line total on the server.
      // Ignore any client-provided lineTotal.
      data.lineTotal = Number(
        (
          Number(quantity) * Number(data.unitPrice)
        ).toFixed(2)
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

};
