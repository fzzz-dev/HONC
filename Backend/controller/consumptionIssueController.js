const ConsumptionIssue = require("../model/consumptionIssue");
const ConsumptionIssueDetail = require("../model/consumptionIssueDetail");
const { Op } = require("sequelize");

function getFinancialYear() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  if (month < 4) return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
  return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
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

const getAllConsumptionIssues = async (req, res) => {
  try {
    const issues = await ConsumptionIssue.findAll({
      include: ["details"],
      order: [["createdAt", "DESC"]]
    });
    res.json({ success: true, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getNextNumber = async (req, res) => {
  try {
    const nextNo = await generateIssNo();
    res.json({ success: true, data: { issNo: nextNo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getConsumptionIssueById = async (req, res) => {
  try {
    const issue = await ConsumptionIssue.findByPk(req.params.id, {
      include: ["details"]
    });
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    res.json({ success: true, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createConsumptionIssue = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.issNo) body.issNo = await generateIssNo();
    
    let totalQty = 0;
    let totalAmount = 0;
    
    if (body.details && Array.isArray(body.details)) {
      body.details.forEach(d => {
        totalQty += Number(d.issueQty || 0);
        const amount = (d.rate && d.issueQty) ? Number(d.rate) * Number(d.issueQty) : 0;
        totalAmount += amount;
      });
      body.totalItems = body.details.length;
    }
    body.totalQty = totalQty;
    body.totalAmount = totalAmount;

    if (body.details && Array.isArray(body.details)) {
      body.details = body.details.map(d => {
        const { id, _id, ...rest } = d;
        return {
          ...rest,
          stkQty: rest.stkQty || 0,
          issueQty: rest.issueQty || 0,
          uom: rest.uom || "",
          balQty: rest.balQty || 0,
          issueRemarks: rest.issueRemarks || ""
        };
      });
    }

    const issue = await ConsumptionIssue.create(body, { include: ["details"] });
    res.status(201).json({ success: true, data: issue });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateConsumptionIssue = async (req, res) => {
  try {
    const issue = await ConsumptionIssue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    
    const body = { ...req.body };
    let totalQty = 0;
    let totalAmount = 0;
    
    if (body.details && Array.isArray(body.details)) {
      body.details.forEach(d => {
        totalQty += Number(d.issueQty || 0);
        const amount = (d.rate && d.issueQty) ? Number(d.rate) * Number(d.issueQty) : 0;
        totalAmount += amount;
      });
      body.totalItems = body.details.length;
    }
    body.totalQty = totalQty;
    body.totalAmount = totalAmount;

    await issue.update(body);

    if (body.details) {
      await ConsumptionIssueDetail.destroy({ where: { consumptionIssueId: issue.id } });
      const detailsToCreate = body.details.map(d => {
        const { id, _id, ...rest } = d;
        return {
          ...rest,
          consumptionIssueId: issue.id,
          stkQty: rest.stkQty || 0,
          issueQty: rest.issueQty || 0,
          uom: rest.uom || "",
          balQty: rest.balQty || 0,
          issueRemarks: rest.issueRemarks || ""
        };
      });
      if (detailsToCreate.length > 0) {
        await ConsumptionIssueDetail.bulkCreate(detailsToCreate);
      }
    }

    const updatedIssue = await ConsumptionIssue.findByPk(req.params.id, { include: ["details"] });
    res.json({ success: true, data: updatedIssue });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteConsumptionIssue = async (req, res) => {
  try {
    const issue = await ConsumptionIssue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    await issue.destroy();
    res.json({ success: true, message: "Issue deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllConsumptionIssues,
  getNextNumber,
  getConsumptionIssueById,
  createConsumptionIssue,
  updateConsumptionIssue,
  deleteConsumptionIssue
};