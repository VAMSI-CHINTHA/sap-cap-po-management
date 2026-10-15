
const cds = require('@sap/cds');

module.exports = function () {
  const { PurchaseOrderItems, PurchaseOrders } = this.entities;

  // Calculate line total before saving an item
  this.before(
    ['CREATE', 'UPDATE'],
    'PurchaseOrderItems',
    async (req) => {
      const data = req.data;
      let quantity = data.quantity;
      let unitPrice = data.unitPrice;

      // For updates, fetch existing values if omitted from the request
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

      if (quantity == null || !Number.isFinite(Number(quantity)) ||
          Number(quantity) <= 0) {
        return req.reject(400, 'Quantity must be greater than zero');
      }

      if (unitPrice == null || !Number.isFinite(Number(unitPrice)) ||
          Number(unitPrice) < 0) {
        return req.reject(400, 'Unit price cannot be negative');
      }

      // Always calculate this on the backend
      data.lineTotal = Number(
        (Number(quantity) * Number(unitPrice)).toFixed(2)
      );
    }
  );

  // Recalculate PO total after an item is created or updated
  this.after(
    ['CREATE', 'UPDATE'],
    'PurchaseOrderItems',
    async (result, req) => {
      const itemID = result?.ID || req.data.ID;
      let purchaseOrderID =
        result?.purchaseOrder_ID || req.data.purchaseOrder_ID;

      // Find the parent ID when it wasn't included in the request
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
