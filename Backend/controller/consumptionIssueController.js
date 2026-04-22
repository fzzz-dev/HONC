const ConsumptionIssue = require("../model/consumptionIssue");

exports.getAllConsumptionIssues = async (req, res) => {
  try {
    const issues = await ConsumptionIssue.findAll();
    res.json({ success: true, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    const issue = await ConsumptionIssue.create(req.body);
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
