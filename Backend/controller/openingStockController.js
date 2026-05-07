const OpeningStock = require("../model/openingStock");
const { Op } = require("sequelize");

function getFinancialYear() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  if (month < 4) return `${year - 1}-${year}`;
  return `${year}-${year + 1}`;
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
    const record = await OpeningStock.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.openingNo) body.openingNo = await generateOpeningNo();
    const record = await OpeningStock.create(body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await OpeningStock.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    await record.update(req.body);
    res.json({ success: true, data: record });
  } catch (error) {
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
