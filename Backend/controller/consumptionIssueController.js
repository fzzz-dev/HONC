const ConsumptionIssue = require("../model/consumptionIssue");
const { Op } = require("sequelize");

function getFinancialYear() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  if (month < 4) return `${year - 1}-${year}`;
  return `${year}-${year + 1}`;
}

async function generateIssNo() {
  const fy = getFinancialYear();
  const prefix = "ISS/";
  const last = await ConsumptionIssue.findOne({
    where: {
      issNo: { [Op.like]: `${prefix}%/${fy}` }
    },
    order: [["issNo", "DESC"]]
  });

  let next = 1;
  if (last) {
    const parts = last.issNo.split("/");
    if (parts.length === 3) {
      next = parseInt(parts[1], 10) + 1;
    }
  }
  return `${prefix}${String(next).padStart(4, "0")}/${fy}`;
}


exports.getAllConsumptionIssues = async (req, res) => {
  try {
    const issues = await ConsumptionIssue.findAll({
      order: [["createdAt", "DESC"]]
    });
    res.json({ success: true, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNextNumber = async (req, res) => {
  try {
    const nextNo = await generateIssNo();
    res.json({ success: true, data: { issNo: nextNo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getConsumptionIssueById = async (req, res) => {
  try {
    const issue = await ConsumptionIssue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    res.json({ success: true, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createConsumptionIssue = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.issNo) body.issNo = await generateIssNo();
    const issue = await ConsumptionIssue.create(body);
    res.status(201).json({ success: true, data: issue });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateConsumptionIssue = async (req, res) => {
  try {
    const issue = await ConsumptionIssue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    await issue.update(req.body);
    res.json({ success: true, data: issue });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteConsumptionIssue = async (req, res) => {
  try {
    const issue = await ConsumptionIssue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    await issue.destroy();
    res.json({ success: true, message: "Issue deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

