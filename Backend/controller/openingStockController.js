const OpeningStock = require("../model/openingStock");
const { Op } = require("sequelize");

function getFinancialYear() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const yy = String(year).slice(-2);
  const nextYy = String(year + 1).slice(-2);
  const prevYy = String(year - 1).slice(-2);
  if (month < 4) return `${prevYy}-${yy}`;
  return `${yy}-${nextYy}`;
}

async function generateOpeningNo() {
  const fy = getFinancialYear();
  const prefix = "OS/";
  const last = await OpeningStock.findOne({
    where: {
      openingNo: { [Op.like]: `${prefix}%/${fy}` }
    },
    order: [["openingNo", "DESC"]]
  });

  let next = 1;
  if (last) {
    const parts = last.openingNo.split("/");
    if (parts.length === 3) {
      next = parseInt(parts[1], 10) + 1;
    }
  }
  return `${prefix}${String(next).padStart(4, "0")}/${fy}`;
}

exports.getAll = async (req, res) => {
  try {
    const records = await OpeningStock.findAll({
      include: ["details"],
      order: [["createdAt", "DESC"]]
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNextNumber = async (req, res) => {
  try {
    const nextNo = await generateOpeningNo();
    res.json({ success: true, data: { openingNo: nextNo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const record = await OpeningStock.findByPk(req.params.id, {
      include: ["details"]
    });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  const transaction = await OpeningStock.sequelize.transaction();
  try {
    const { details, ...body } = req.body;
    if (!body.openingNo) body.openingNo = await generateOpeningNo();
    
    let totalQty = 0;
    let totalAmount = 0;
    let totalItems = 0;
    
    if (details && Array.isArray(details)) {
      totalItems = details.length;
      totalQty = details.reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
      totalAmount = details.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    }
    
    body.totalQty = totalQty;
    body.totalAmount = totalAmount;
    body.totalItems = totalItems;
    
    const record = await OpeningStock.create(body, { transaction });
    
    if (details && details.length > 0) {
      const detailRows = details.map(d => {
        const { id, _id, ...rest } = d;
        return { ...rest, openingStockId: record.id };
      });
      await OpeningStock.sequelize.models.OpeningStockDetail.bulkCreate(detailRows, { transaction });
    }
    
    await transaction.commit();
    
    const created = await OpeningStock.findByPk(record.id, { include: ["details"] });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  const transaction = await OpeningStock.sequelize.transaction();
  try {
    const record = await OpeningStock.findByPk(req.params.id);
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    
    const { details, ...body } = req.body;
    
    let totalQty = 0;
    let totalAmount = 0;
    let totalItems = 0;
    
    if (details && Array.isArray(details)) {
      totalItems = details.length;
      totalQty = details.reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
      totalAmount = details.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    }
    
    body.totalQty = totalQty;
    body.totalAmount = totalAmount;
    body.totalItems = totalItems;
    
    await record.update(body, { transaction });
    
    if (details && Array.isArray(details)) {
      await OpeningStock.sequelize.models.OpeningStockDetail.destroy({ where: { openingStockId: record.id }, transaction });
      const detailRows = details.map(d => {
        const { id, _id, ...rest } = d;
        return { ...rest, openingStockId: record.id };
      });
      await OpeningStock.sequelize.models.OpeningStockDetail.bulkCreate(detailRows, { transaction });
    }
    
    await transaction.commit();
    
    const updated = await OpeningStock.findByPk(record.id, { include: ["details"] });
    res.json({ success: true, data: updated });
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const record = await OpeningStock.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    await record.destroy();
    res.json({ success: true, message: "Record deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
