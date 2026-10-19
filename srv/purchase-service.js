
const cds = require('@sap/cds');

module.exports = function () {
  const {
    PurchaseOrderItems,
    PurchaseOrders,
    Suppliers,
    SupplierCompanyAuthorizations
  } = this.entities;

  // BUSINESS RULE 1:
  // Supplier must be active and authorized for the company code.
  this.before(
    ['CREATE', 'UPDATE'],
    'PurchaseOrders',
    async (req) => {
      const data = req.data;

      let supplierID = data.supplier_ID;
      let companyCodeID = data.companyCode_ID;

      // For updates, retain existing values when fields are omitted.
      if (req.event === 'UPDATE') {
        const key = req.params?.[0];

        const poID =
          data.ID ||
          (typeof key === 'string' ? key : key?.ID);

        if (!poID) {
          return req.reject(
            400,
            'Unable to identify the purchase order'
          );
        }

        const existingPO = await SELECT.one
          .from(PurchaseOrders)
          .columns('supplier_ID', 'companyCode_ID')
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
      }

      // Both references are required.
      if (!supplierID || !companyCodeID) {
        return req.reject(
          400,
          'Supplier and company code are required'
        );
      }

      // Check 1: Supplier must exist.
      const supplier = await SELECT.one
        .from(Suppliers)
        .columns('ID', 'status')
        .where({ ID: supplierID });

      if (!supplier) {
        return req.reject(
          400,
          'Selected supplier does not exist'
        );
      }

      // Check 2: Supplier must be active.
      if (supplier.status !== 'Active') {
        return req.reject(
          400,
          'Only active suppliers can be used in purchase orders'
        );
      }

      // Check 3: Supplier must be authorized for this company code.
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
  );

  // Calculate line total before saving an item.
  this.before(
    ['CREATE', 'UPDATE'],
    'PurchaseOrderItems',
    async (req) => {
      const data = req.data;
      let quantity = data.quantity;
      let unitPrice = data.unitPrice;

      // For updates, fetch existing values if omitted.
      if (req.event === 'UPDATE') {
        const existing = await SELECT.one
          .from(PurchaseOrderItems)
          .columns('quantity', 'unitPrice')
          .where({ ID: data.ID });

        if (!existing) {
          return req.reject(404, 'Purchase order item not found');
        }

        if (quantity === undefined) quantity = existing.quantity;
        if (unitPrice === undefined) unitPrice = existing.unitPrice;
      }

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

      if (
        unitPrice == null ||
        !Number.isFinite(Number(unitPrice)) ||
        Number(unitPrice) < 0
      ) {
        return req.reject(
          400,
          'Unit price cannot be negative'
        );
      }

      // Never trust a client-provided lineTotal.
      data.lineTotal = Number(
        (Number(quantity) * Number(unitPrice)).toFixed(2)
      );
    }
  );

  // Recalculate PO total after an item is created or updated.
  this.after(
    ['CREATE', 'UPDATE'],
    'PurchaseOrderItems',
    async (result, req) => {
      const itemID = result?.ID || req.data.ID;

      let purchaseOrderID =
        result?.purchaseOrder_ID || req.data.purchaseOrder_ID;

      // Find the parent ID when it wasn't included in the request.
      if (!purchaseOrderID && itemID) {
        const item = await SELECT.one
          .from(PurchaseOrderItems)
          .columns('purchaseOrder_ID')
          .where({ ID: itemID });

        purchaseOrderID = item?.purchaseOrder_ID;
      }

      if (!purchaseOrderID) return;

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
  );
};
