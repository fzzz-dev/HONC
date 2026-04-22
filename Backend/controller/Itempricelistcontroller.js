const ItemPriceList = require("../model/Itempricelist");
const Supplier = require("../model/supplier");
const Item = require("../model/item");
const InventoryHead = require("../model/inventoryHead");
const { Op } = require("sequelize");

class ItemPriceListController {
  static async generateListNo() {
    const year = new Date().getFullYear();
    const prefix = `IPL-${year}-`;
    const latest = await ItemPriceList.findOne({
      where: { listNo: { [Op.like]: `${prefix}%` } },
      order: [["listNo", "DESC"]]
    });

    let nextNum = 1;
    if (latest) {
      const match = latest.listNo.match(/^IPL-\d{4}-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(nextNum).padStart(3, "0")}`;
  }

  static async create(req, res) {
    try {
      const { supplierId, date, details, validFrom, validTo, notes } = req.body;
      if (!supplierId || !details || !Array.isArray(details) || details.length === 0) {
        return res.status(400).json({ success: false, message: "Supplier ID and at least one detail item are required" });
      }

      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });

      const listNo = await ItemPriceListController.generateListNo();
      const priceList = await ItemPriceList.create({
        listNo, supplierId, supplierName: supplier.supplierName,
        date: date || new Date(),
        details: details.map((d) => ({ ...d, id: d.id || Math.floor(Math.random() * 10000) })),
        validFrom: validFrom || new Date(),
        validTo, notes, createdBy: req.user?.id || 1
      });

      res.status(201).json({ success: true, message: "Item Price List created successfully", data: priceList });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const { page = 1, limit = 10, supplierId, status, search, sortBy = "createdAt", sortOrder = "DESC" } = req.query;
      const where = { isActive: true };
      if (supplierId) where.supplierId = supplierId;
      if (status) where.status = status;
      if (search) {
        where[Op.or] = [
          { listNo: { [Op.like]: `%${search}%` } },
          { supplierName: { [Op.like]: `%${search}%` } },
          { notes: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await ItemPriceList.findAndCountAll({
        where,
        offset: (page - 1) * limit,
        limit: parseInt(limit),
        order: [[sortBy, sortOrder.toUpperCase()]],
      });

      res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const priceList = await ItemPriceList.findByPk(req.params.id);
      if (!priceList) return res.status(404).json({ success: false, message: "Price list not found" });
      res.json({ success: true, data: priceList });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const priceList = await ItemPriceList.findByPk(req.params.id);
      if (!priceList) return res.status(404).json({ success: false, message: "Price list not found" });
      if (priceList.status === "archived") return res.status(400).json({ success: false, message: "Cannot edit archived price list" });

      const { supplierId, date, details, validFrom, validTo, status, notes } = req.body;

      const updateData = { date, validFrom, validTo, status, notes, updatedBy: req.user?.id || 1 };
      if (supplierId && String(supplierId) !== String(priceList.supplierId)) {
        const supplier = await Supplier.findByPk(supplierId);
        if (supplier) {
          updateData.supplierId = supplierId;
          updateData.supplierName = supplier.supplierName;
        }
      }
      if (details) updateData.details = details;

      await priceList.update(updateData);
      res.json({ success: true, message: "Price list updated successfully", data: priceList });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const priceList = await ItemPriceList.findByPk(req.params.id);
      if (!priceList) return res.status(404).json({ success: false, message: "Price list not found" });
      await priceList.update({ isActive: false, status: "archived" });
      res.json({ success: true, message: "Price list deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async search(req, res) {
    try {
      const { q, itemId, supplierId, startDate, endDate, status } = req.query;
      const where = { isActive: true };
      if (q) {
        where[Op.or] = [
          { listNo: { [Op.like]: `%${q}%` } },
          { supplierName: { [Op.like]: `%${q}%` } },
        ];
      }
      if (itemId) {
        // Since details is JSON, we might need a custom filter
      }
      if (supplierId) where.supplierId = supplierId;
      if (status) where.status = status;

      const results = await ItemPriceList.findAll({ where, limit: 50, order: [["createdAt", "DESC"]] });
      res.json({ success: true, data: results, count: results.length });
    } catch (error) {
      res.status(500).json({ success: false, message: "Search failed", error: error.message });
    }
  }

  static async getExpired(req, res) {
    try {
      const expired = await ItemPriceList.findAll({
        where: { isActive: true, status: "active", validTo: { [Op.lt]: new Date() } },
        order: [["validTo", "DESC"]]
      });
      res.json({ success: true, data: expired, count: expired.length });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch expired price lists" });
    }
  }

  static async getBySupplier(req, res) {
    try {
      const { supplierId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const { count, rows } = await ItemPriceList.findAndCountAll({
        where: { supplierId, isActive: true, status: "active" },
        offset: (page - 1) * limit,
        limit: parseInt(limit),
        order: [["date", "DESC"]]
      });
      res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch supplier price lists" });
    }
  }

  static async getItemPrices(req, res) {
    try {
      const { itemId } = req.params;
      const priceLists = await ItemPriceList.findAll({ where: { isActive: true, status: "active" } });
      const prices = [];
      priceLists.forEach(pl => {
        const detail = (pl.details || []).find(d => String(d.itemId) === String(itemId));
        if (detail) {
          prices.push({
            priceListId: pl.id, priceListNo: pl.listNo, supplierId: pl.supplierId, supplierName: pl.supplierName,
            price: detail.price, discPct: detail.discPct, gstPct: detail.gstPct,
            validFrom: pl.validFrom, validTo: pl.validTo,
            isValid: new Date() >= new Date(pl.validFrom) && (!pl.validTo || new Date() <= new Date(pl.validTo))
          });
        }
      });
      prices.sort((a, b) => a.price - b.price);
      res.json({ success: true, data: prices, count: prices.length });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch item prices" });
    }
  }

  static async bulkUpdateStatus(req, res) {
    try {
      const { ids, status } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: "IDs array required" });
      const [affectedCount] = await ItemPriceList.update({ status }, { where: { id: { [Op.in]: ids } } });
      res.json({ success: true, message: `Updated ${affectedCount} price list(s)` });
    } catch (error) {
      res.status(500).json({ success: false, message: "Bulk update failed" });
    }
  }

  static async export(req, res) {
    try {
      const pl = await ItemPriceList.findByPk(req.params.id);
      if (!pl) return res.status(404).json({ success: false, message: "Price list not found" });
      res.json({ success: true, data: pl });
    } catch (error) {
      res.status(500).json({ success: false, message: "Export failed" });
    }
  }
}

module.exports = ItemPriceListController;