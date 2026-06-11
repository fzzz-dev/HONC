const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

const PurchaseGRN = sequelize.define("PurchaseGRN", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  grnNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  grnType: {
    type: DataTypes.STRING,
    defaultValue: "Against PO",
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Suppliers',
      key: 'id',
    },
  },
  supplierName: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  storeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Stores',
      key: 'id',
    },
  },
  storeName: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  invoiceNo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  invoiceDate: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  vehicleNo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  lrNo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  transporterName: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  gstEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  gstType: {
    type: DataTypes.ENUM("local", "other"),
    defaultValue: "local",
  },
  status: {
    type: DataTypes.ENUM("Draft", "Completed", "Cancelled"),
    defaultValue: "Completed",
  },
  createdBy: {
    type: DataTypes.STRING,
    defaultValue: "Admin",
  },
  createdOn: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  verifiedBy: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  verifiedOn: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  remarks: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  totalQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totalItems: { type: DataTypes.INTEGER, defaultValue: 0 },
  transportCharges: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: (grn) => {
      if (!grn.createdOn) {
        grn.createdOn = new Date().toISOString();
      }
    },
    
   afterSave: async (grn) => {
  try {
    const { recalculatePOGRNQuantities } = require("../utils/recalculatePOGRNQuantities");
    const PurchaseOrder = require("./purchaseOrder");
    const PurchaseGRN = require("./purchaseGRN");
    
    await recalculatePOGRNQuantities();
    
    const freshGrn = await PurchaseGRN.findByPk(grn.id, {
      include: ["details"]
    });
    
    if (!freshGrn) return;
    
    let affectedPoIds = new Set();
    const grnDetails = freshGrn.details || [];
    
    grnDetails.forEach(detail => {
      if (detail && detail.poId) {
        affectedPoIds.add(parseInt(detail.poId));
      }
    });
    
    for (const poId of affectedPoIds) {
      const po = await PurchaseOrder.findByPk(poId, { include: ["details"] });
      if (!po || po.status === "Cancelled") continue;
      
      const allGrns = await PurchaseGRN.findAll({
        where: { status: "Completed" },
        include: ["details"]
      });
      
      const receivedMap = new Map();
      allGrns.forEach((g) => {
        let gDetails = g.details;
        if (typeof gDetails === 'string') {
          try { gDetails = JSON.parse(gDetails); } catch (e) { gDetails = []; }
        }
        if (!Array.isArray(gDetails)) gDetails = [];
        
        gDetails.forEach((gd) => {
          if (gd && String(gd.poId) === String(poId)) {
            const key = gd.poDetailId || `item_${gd.itemId || gd.itemName}`;
            const currentQty = receivedMap.get(key) || 0;
            receivedMap.set(key, currentQty + Number(gd.grnQty || 0));
          }
        });
      });
      
      let totalPoQty = 0;
      let totalReceivedQty = 0;
      const poDetails = po.details || [];
      
      poDetails.forEach((detail) => {
        const poQty = Number(detail.poQty || 0);
        totalPoQty += poQty;
        const detailId = detail.id || detail._id;
        let receivedQty = receivedMap.get(detailId) || 0;
        if (receivedQty === 0 && detail.itemId) {
          receivedQty = receivedMap.get(`item_${detail.itemId}`) || 0;
        }
        totalReceivedQty += receivedQty;
      });
      
      let newStatus;
      if (totalReceivedQty === 0) {
        newStatus = "Open";
      } else if (totalReceivedQty >= totalPoQty && totalPoQty > 0) {
        newStatus = "Closed";
      } else if (totalReceivedQty > 0 && totalReceivedQty < totalPoQty) {
        newStatus = "Partial";
      } else {
        newStatus = "Open";
      }
      
      if (newStatus !== po.status) {
        await po.update({ status: newStatus });
        console.log(`✅ PO ${po.poNo}: ${po.status} → ${newStatus}`);
      }
    }
  } catch (e) {
    console.error("afterSave GRN hook error:", e.message);
  }
},
    
afterUpdate: async (grn) => {
  try {
    const { recalculatePOGRNQuantities } = require("../utils/recalculatePOGRNQuantities");
    const PurchaseOrder = require("./purchaseOrder");
    const PurchaseGRN = require("./purchaseGRN");
    
    await recalculatePOGRNQuantities();
    
    // Fetch fresh GRN with details
    const freshGrn = await PurchaseGRN.findByPk(grn.id, {
      include: ["details"]
    });
    
    if (!freshGrn) {
      console.log("Could not fetch GRN with details for status update");
      return;
    }
    
    // Get affected PO IDs
    let affectedPoIds = new Set();
    const grnDetails = freshGrn.details || [];
    
    grnDetails.forEach(detail => {
      if (detail && detail.poId) {
        affectedPoIds.add(parseInt(detail.poId));
      }
    });
    
    if (affectedPoIds.size === 0) {
      console.log("No PO IDs found in GRN details");
      return;
    }
    
    for (const poId of affectedPoIds) {
      const po = await PurchaseOrder.findByPk(poId, { include: ["details"] });
      if (!po || po.status === "Cancelled") continue;
      
      // Get ALL GRNs (including ALL completed GRNs)
      const allGrns = await PurchaseGRN.findAll({
        where: { status: "Completed" },
        include: ["details"]
      });
      
      // Calculate received quantities from ALL GRNs for this PO
      const receivedMap = new Map();
      
      allGrns.forEach((g) => {
        let gDetails = g.details;
        if (typeof gDetails === 'string') {
          try { gDetails = JSON.parse(gDetails); } catch (e) { gDetails = []; }
        }
        if (!Array.isArray(gDetails)) gDetails = [];
        
        gDetails.forEach((gd) => {
          if (gd && String(gd.poId) === String(poId)) {
            // Use poDetailId for accurate matching
            const key = gd.poDetailId || `item_${gd.itemId || gd.itemName}`;
            const currentQty = receivedMap.get(key) || 0;
            receivedMap.set(key, currentQty + Number(gd.grnQty || 0));
            console.log(`[DEBUG] Received: ${key}, Qty: ${gd.grnQty}, Total: ${currentQty + Number(gd.grnQty || 0)}`);
          }
        });
      });
      
      // Calculate totals by matching each PO detail with received quantities
      let totalPoQty = 0;
      let totalReceivedQty = 0;
      const poDetails = po.details || [];
      
      poDetails.forEach((detail) => {
        const poQty = Number(detail.poQty || 0);
        totalPoQty += poQty;
        
        // Match by poDetailId first
        const detailId = detail.id || detail._id;
        let receivedQty = receivedMap.get(detailId) || 0;
        
        // If not found, try matching by itemId
        if (receivedQty === 0 && detail.itemId) {
          receivedQty = receivedMap.get(`item_${detail.itemId}`) || 0;
        }
        
        totalReceivedQty += receivedQty;
        console.log(`[DEBUG] PO Detail ${detailId}: PO Qty=${poQty}, Received=${receivedQty}, Item=${detail.itemName}`);
      });
      
      console.log(`📊 PO ${po.poNo}: Total PO Qty = ${totalPoQty}, Total Received = ${totalReceivedQty}, Current Status = ${po.status}`);
      
      // Determine new status
      let newStatus;
      if (totalReceivedQty === 0) {
        newStatus = "Open";
      } else if (totalReceivedQty >= totalPoQty && totalPoQty > 0) {
        newStatus = "Closed";
      } else if (totalReceivedQty > 0 && totalReceivedQty < totalPoQty) {
        newStatus = "Partial";
      } else {
        newStatus = "Open";
      }
      
      console.log(`🎯 PO ${po.poNo}: New Status should be = ${newStatus}`);
      
      if (newStatus !== po.status) {
        await po.update({ status: newStatus });
        console.log(`✅ PO ${po.poNo}: ${po.status} → ${newStatus} (after GRN edit)`);
      } else {
        console.log(`ℹ️ PO ${po.poNo}: Status unchanged (${po.status}) - ${totalReceivedQty}/${totalPoQty} received`);
      }
    }
  } catch (e) {
    console.error("afterUpdate GRN hook error:", e.message);
    console.error(e.stack);
  }
},
    
    afterDestroy: async (grn) => {
      try {
        const { recalculatePOGRNQuantities } = require("../utils/recalculatePOGRNQuantities");
        const PurchaseOrder = require("./purchaseOrder");
        const PurchaseGRN = require("./purchaseGRN");
        
        await recalculatePOGRNQuantities();
        
        let affectedPoIds = new Set();
        let grnDetails = grn.dataValues?.details || grn.details;
        
        if (typeof grnDetails === 'string') {
          try {
            grnDetails = JSON.parse(grnDetails);
          } catch (e) {
            grnDetails = [];
          }
        }
        
        if (Array.isArray(grnDetails)) {
          grnDetails.forEach(detail => {
            if (detail && detail.poId) {
              affectedPoIds.add(parseInt(detail.poId));
            }
          });
        }
        
        // If no POs found, recalculate all
        if (affectedPoIds.size === 0) {
          const allPos = await PurchaseOrder.findAll({
            where: { status: { [Op.ne]: "Cancelled" } }
          });
          
          const allGrns = await PurchaseGRN.findAll({
            where: { status: "Completed" },
            include: ["details"]
          });
          
          for (const po of allPos) {
            let totalPoQty = 0;
            let totalReceivedQty = 0;
            const poDetails = po.details || [];
            
            poDetails.forEach((detail) => {
              totalPoQty += Number(detail.poQty || 0);
            });
            
            const receivedMap = {};
            allGrns.forEach((g) => {
              let gDetails = g.details;
              if (typeof gDetails === 'string') {
                try { gDetails = JSON.parse(gDetails); } catch (e) { gDetails = []; }
              }
              if (!Array.isArray(gDetails)) gDetails = [];
              
              gDetails.forEach((gd) => {
                if (gd && String(gd.poId) === String(po.id)) {
                  const key = gd.poDetailId || gd.itemId || gd.itemName;
                  receivedMap[key] = (receivedMap[key] || 0) + Number(gd.grnQty || 0);
                }
              });
            });
            
            poDetails.forEach((detail) => {
              const detailId = detail.id || detail._id;
              const itemKey = detail.itemId || detail.itemName;
              const receivedQty = receivedMap[detailId] || receivedMap[itemKey] || 0;
              totalReceivedQty += receivedQty;
            });
            
            let newStatus = po.status;
            if (totalReceivedQty === 0) {
              newStatus = "Open";
            } else if (totalReceivedQty >= totalPoQty && totalPoQty > 0) {
              newStatus = "Closed";
            } else if (totalReceivedQty > 0 && totalReceivedQty < totalPoQty) {
              newStatus = "Partial";
            }
            
            if (newStatus !== po.status) {
              await po.update({ status: newStatus });
              console.log(`✅ PO ${po.poNo}: ${po.status} → ${newStatus}`);
            }
          }
          return;
        }
        
        // Update each affected PO
        for (const poId of affectedPoIds) {
          const po = await PurchaseOrder.findByPk(poId, { include: ["details"] });
          if (!po || po.status === "Cancelled") continue;
          
          const allGrns = await PurchaseGRN.findAll({
            where: { status: "Completed" },
            include: ["details"]
          });
          
          const receivedMap = {};
          allGrns.forEach((g) => {
            if (g.id === grn.id) return;
            
            let gDetails = g.details;
            if (typeof gDetails === 'string') {
              try { gDetails = JSON.parse(gDetails); } catch (e) { gDetails = []; }
            }
            if (!Array.isArray(gDetails)) gDetails = [];
            
            gDetails.forEach((gd) => {
              if (gd && String(gd.poId) === String(poId)) {
                const key = gd.poDetailId || gd.itemId || gd.itemName;
                receivedMap[key] = (receivedMap[key] || 0) + Number(gd.grnQty || 0);
              }
            });
          });
          
          let totalPoQty = 0;
          let totalReceivedQty = 0;
          const poDetails = po.details || [];
          
          poDetails.forEach((detail) => {
            const poQty = Number(detail.poQty || 0);
            totalPoQty += poQty;
            const detailId = detail.id || detail._id;
            const itemKey = detail.itemId || detail.itemName;
            const receivedQty = receivedMap[detailId] || receivedMap[itemKey] || 0;
            totalReceivedQty += receivedQty;
          });
          
          let newStatus;
          if (totalReceivedQty === 0) {
            newStatus = "Open";
          } else if (totalReceivedQty >= totalPoQty && totalPoQty > 0) {
            newStatus = "Closed";
          } else if (totalReceivedQty > 0 && totalReceivedQty < totalPoQty) {
            newStatus = "Partial";
          } else {
            newStatus = "Open";
          }
          
          if (newStatus !== po.status) {
            await po.update({ status: newStatus });
            console.log(`✅ PO ${po.poNo}: ${po.status} → ${newStatus}`);
          }
        }
      } catch (e) {
        console.error("afterDestroy GRN hook error:", e.message);
      }
    },
  },
});

module.exports = PurchaseGRN;