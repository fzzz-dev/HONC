const ItemPriceList = require("../model/Itempricelist");
const Supplier = require("../model/supplier");
const Item = require("../model/item");
const InventoryHead = require("../model/inventoryHead");

class ItemPriceListController {
  /**
   * Generate unique list number with auto-increment
   * Format: IPL-YYYY-XXX
   * @returns {Promise<string>}
   */
  static async generateListNo() {
    const year = new Date().getFullYear();
    const prefix = `IPL-${year}-`;

    // Find max number for current year
    const result = await ItemPriceList.aggregate([
      {
        $match: {
          listNo: { $regex: `^${prefix}` },
        },
      },
      {
        $addFields: {
          numPart: {
            $toInt: { $substr: ["$listNo", prefix.length, -1] },
          },
        },
      },
      {
        $group: {
          _id: null,
          maxNum: { $max: "$numPart" },
        },
      },
    ]);

    const maxNum = result[0]?.maxNum || 0;
    const nextNum = maxNum + 1;

    return `${prefix}${String(nextNum).padStart(3, "0")}`;
  }

  /**
   * Create new Item Price List
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async create(req, res) {
    try {
      const { supplierId, supplierName, date, details, validFrom, validTo, notes } =
        req.body;

      // Validate required fields
      if (!supplierId || !details || !Array.isArray(details) || details.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Supplier ID and at least one detail item are required",
        });
      }

      // Validate supplier exists
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      // Validate all items exist
      const itemIds = details.map((d) => d.itemId);
      const items = await Item.find({ _id: { $in: itemIds } });
      if (items.length !== itemIds.length) {
        return res.status(404).json({
          success: false,
          message: "One or more items not found",
        });
      }

      // Validate all heads exist
      const headIds = details.map((d) => d.inventoryHeadId);
      const heads = await InventoryHead.find({ _id: { $in: headIds } });
      if (heads.length !== headIds.length) {
        return res.status(404).json({
          success: false,
          message: "One or more inventory heads not found",
        });
      }

      // Generate list number
      const listNo = await this.generateListNo();

      // Create price list
      const priceList = new ItemPriceList({
        listNo,
        supplierId,
        supplierName: supplier.supplierName,
        date: date || new Date(),
        details: details.map((d) => ({
          ...d,
          id: d.id || Math.floor(Math.random() * 10000),
        })),
        validFrom: validFrom || new Date(),
        validTo: validTo,
        notes,
        createdBy: req.user?._id,
      });

      await priceList.save();

      res.status(201).json({
        success: true,
        message: "Item Price List created successfully",
        data: priceList.toDetailedJSON(),
      });
    } catch (error) {
      console.error("[ItemPriceList.create]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create price list",
      });
    }
  }

  /**
   * Get all Item Price Lists with filtering and pagination
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        supplierId,
        status,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build filter
      const filter = { isActive: true };

      if (supplierId) {
        filter.supplierId = supplierId;
      }

      if (status) {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { listNo: { $regex: search, $options: "i" } },
          { supplierName: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;

      // Build sort
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Execute query
      const [priceLists, total] = await Promise.all([
        ItemPriceList.find(filter)
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .populate("supplierId", "supplierName type")
          .populate("details.itemId", "itemName subCategory")
          .populate("createdBy", "name email"),
        ItemPriceList.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: priceLists.map((pl) => ({
          ...pl.toObject(),
          totalItems: pl.totalItems,
          grandTotal: pl.calculateGrandTotal(),
          isExpired: pl.isExpired,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("[ItemPriceList.getAll]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch price lists",
      });
    }
  }

  /**
   * Get single Item Price List by ID
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const priceList = await ItemPriceList.findById(id)
        .populate("supplierId", "supplierName type gstNo")
        .populate("details.itemId", "itemName subCategory uom make spec")
        .populate("details.inventoryHeadId", "headName")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      if (!priceList) {
        return res.status(404).json({
          success: false,
          message: "Price list not found",
        });
      }

      res.json({
        success: true,
        data: priceList.toDetailedJSON(),
      });
    } catch (error) {
      console.error("[ItemPriceList.getById]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch price list",
      });
    }
  }

  /**
   * Update Item Price List
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { supplierId, date, details, validFrom, validTo, status, notes } =
        req.body;

      // Find existing price list
      const priceList = await ItemPriceList.findById(id);
      if (!priceList) {
        return res.status(404).json({
          success: false,
          message: "Price list not found",
        });
      }

      // Prevent editing if archived
      if (priceList.status === "archived") {
        return res.status(400).json({
          success: false,
          message: "Cannot edit archived price list",
        });
      }

      // Validate supplier if changed
      if (supplierId && String(supplierId) !== String(priceList.supplierId)) {
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
          return res.status(404).json({
            success: false,
            message: "Supplier not found",
          });
        }
        priceList.supplierId = supplierId;
        priceList.supplierName = supplier.supplierName;
      }

      // Update fields
      if (date) priceList.date = date;
      if (validFrom) priceList.validFrom = validFrom;
      if (validTo) priceList.validTo = validTo;
      if (status && ["draft", "active", "archived"].includes(status)) {
        priceList.status = status;
      }
      if (notes !== undefined) priceList.notes = notes;

      // Update details if provided
      if (details && Array.isArray(details)) {
        if (details.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Price list must contain at least one item",
          });
        }

        // Validate all items exist
        const itemIds = details.map((d) => d.itemId);
        const items = await Item.find({ _id: { $in: itemIds } });
        if (items.length !== itemIds.length) {
          return res.status(404).json({
            success: false,
            message: "One or more items not found",
          });
        }

        priceList.details = details.map((d) => ({
          ...d,
          id: d.id || Math.floor(Math.random() * 10000),
        }));
      }

      priceList.updatedBy = req.user?._id;
      await priceList.save();

      res.json({
        success: true,
        message: "Price list updated successfully",
        data: priceList.toDetailedJSON(),
      });
    } catch (error) {
      console.error("[ItemPriceList.update]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update price list",
      });
    }
  }

  /**
   * Delete Item Price List (soft delete)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const priceList = await ItemPriceList.findById(id);
      if (!priceList) {
        return res.status(404).json({
          success: false,
          message: "Price list not found",
        });
      }

      // Soft delete
      priceList.isActive = false;
      priceList.status = "archived";
      await priceList.save();

      res.json({
        success: true,
        message: "Price list deleted successfully",
      });
    } catch (error) {
      console.error("[ItemPriceList.delete]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete price list",
      });
    }
  }

  /**
   * Get prices for a specific item from all suppliers
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getItemPrices(req, res) {
    try {
      const { itemId } = req.params;
      const { supplierId, activeOnly = true } = req.query;

      // Build filter
      const filter = {
        isActive: true,
        status: "active",
        "details.itemId": itemId,
      };

      if (supplierId) {
        filter.supplierId = supplierId;
      }

      const priceLists = await ItemPriceList.find(filter)
        .populate("supplierId", "supplierName type")
        .select("listNo supplierId date details validFrom validTo");

      // Extract relevant prices
      const prices = [];
      priceLists.forEach((pl) => {
        const detail = pl.details.find(
          (d) => String(d.itemId) === String(itemId),
        );
        if (detail) {
          prices.push({
            priceListId: pl._id,
            priceListNo: pl.listNo,
            supplierId: pl.supplierId._id,
            supplierName: pl.supplierId.supplierName,
            price: detail.price,
            discPct: detail.discPct,
            gstPct: detail.gstPct,
            freight: detail.freight,
            others: detail.others,
            validFrom: pl.validFrom,
            validTo: pl.validTo,
            isValid: new Date() >= pl.validFrom && (!pl.validTo || new Date() <= pl.validTo),
          });
        }
      });

      // Sort by price
      prices.sort((a, b) => a.price - b.price);

      res.json({
        success: true,
        data: prices,
        count: prices.length,
      });
    } catch (error) {
      console.error("[ItemPriceList.getItemPrices]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch item prices",
      });
    }
  }

  /**
   * Get all active price lists for a supplier
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getBySupplier(req, res) {
    try {
      const { supplierId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;

      const [priceLists, total] = await Promise.all([
        ItemPriceList.find({
          supplierId,
          isActive: true,
          status: "active",
        })
          .sort({ date: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .select("-details"),

        ItemPriceList.countDocuments({
          supplierId,
          isActive: true,
          status: "active",
        }),
      ]);

      res.json({
        success: true,
        data: priceLists.map((pl) => ({
          ...pl.toObject(),
          totalItems: pl.totalItems,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("[ItemPriceList.getBySupplier]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch supplier price lists",
      });
    }
  }

  /**
   * Search price lists with advanced filters
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async search(req, res) {
    try {
      const { q, itemId, supplierId, startDate, endDate, status } = req.query;

      const filter = { isActive: true };

      if (q) {
        filter.$or = [
          { listNo: { $regex: q, $options: "i" } },
          { supplierName: { $regex: q, $options: "i" } },
          { "details.itemName": { $regex: q, $options: "i" } },
        ];
      }

      if (itemId) {
        filter["details.itemId"] = itemId;
      }

      if (supplierId) {
        filter.supplierId = supplierId;
      }

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      if (status) {
        filter.status = status;
      }

      const results = await ItemPriceList.find(filter)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("supplierId", "supplierName");

      res.json({
        success: true,
        data: results,
        count: results.length,
      });
    } catch (error) {
      console.error("[ItemPriceList.search]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Search failed",
      });
    }
  }

  /**
   * Get expired price lists
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getExpired(req, res) {
    try {
      const now = new Date();

      const expired = await ItemPriceList.find({
        isActive: true,
        status: "active",
        validTo: { $lt: now },
      })
        .sort({ validTo: -1 })
        .populate("supplierId", "supplierName");

      res.json({
        success: true,
        data: expired,
        count: expired.length,
      });
    } catch (error) {
      console.error("[ItemPriceList.getExpired]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch expired price lists",
      });
    }
  }

  /**
   * Bulk update status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async bulkUpdateStatus(req, res) {
    try {
      const { ids, status } = req.body;

      if (
        !ids ||
        !Array.isArray(ids) ||
        ids.length === 0 ||
        !["draft", "active", "archived"].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid IDs array and status are required",
        });
      }

      const result = await ItemPriceList.updateMany(
        { _id: { $in: ids } },
        { status, updatedBy: req.user?._id },
      );

      res.json({
        success: true,
        message: `Updated ${result.modifiedCount} price list(s)`,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("[ItemPriceList.bulkUpdateStatus]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Bulk update failed",
      });
    }
  }

  /**
   * Export price list as JSON/CSV
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async export(req, res) {
    try {
      const { id } = req.params;
      const { format = "json" } = req.query;

      const priceList = await ItemPriceList.findById(id)
        .populate("supplierId")
        .populate("details.itemId");

      if (!priceList) {
        return res.status(404).json({
          success: false,
          message: "Price list not found",
        });
      }

      if (format === "csv") {
        // Generate CSV
        let csv =
          "Item Name,Category,Price,Discount %,GST %,Freight,Others,From Date,To Date,Notes\n";
        priceList.details.forEach((d) => {
          csv += `"${d.itemName}","${d.subCategory}",${d.price},${d.discPct},${d.gstPct},${d.freight},${d.others},"${d.fromDate}","${d.toDate}","${d.notes}"\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="pricelist-${priceList.listNo}.csv"`,
        );
        res.send(csv);
      } else {
        // Default: JSON
        res.json({
          success: true,
          data: priceList.toDetailedJSON(),
        });
      }
    } catch (error) {
      console.error("[ItemPriceList.export]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Export failed",
      });
    }
  }
}

module.exports = ItemPriceListController;