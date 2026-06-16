const IssueType = require("../model/issueType");
const IssueTypeDescription = require("../model/issueTypeDescription");
const { Op } = require("sequelize");

// ── GET all issue types with descriptions ──────────────────────────────────────────
exports.getAllIssueTypes = async (req, res) => {
  try {
    const { search, active } = req.query;
    const where = {};
    if (search) where.issueType = { [Op.like]: `%${search}%` };
    if (active !== undefined) where.active = active === "true";

    const issueTypes = await IssueType.findAll({
      where,
      include: [{
        model: IssueTypeDescription,
        as: "descriptions",
        where: { active: true },
        required: false,
      }],
      order: [["issueType", "ASC"]],
    });

    res.status(200).json({ success: true, count: issueTypes.length, data: issueTypes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single issue type by ID with descriptions ──────────────────────────────────
exports.getIssueTypeById = async (req, res) => {
  try {
    const issueType = await IssueType.findByPk(req.params.id, {
      include: [{
        model: IssueTypeDescription,
        as: "descriptions",
        where: { active: true },
        required: false,
      }],
    });
    if (!issueType) return res.status(404).json({ success: false, message: "Issue Type not found" });
    res.status(200).json({ success: true, data: issueType });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE issue type with descriptions ────────────────────────────────────────────
exports.createIssueType = async (req, res) => {
  try {
    const { issueType, descriptions, active } = req.body;
    
    const existing = await IssueType.findOne({ where: { issueType: issueType.trim() } });
    if (existing) return res.status(409).json({ success: false, message: `Issue Type "${issueType}" already exists` });

    const newIssueType = await IssueType.create({ 
      issueType: issueType.trim(), 
      active: active !== undefined ? active : true,
    });
    
    // Create descriptions
    if (descriptions && descriptions.length > 0) {
      const descriptionRecords = descriptions.map(desc => ({
        issueTypeId: newIssueType.id,
        description: desc.trim(),
        active: true,
      }));
      await IssueTypeDescription.bulkCreate(descriptionRecords);
    }
    
    // Fetch the complete record with descriptions
    const result = await IssueType.findByPk(newIssueType.id, {
      include: [{ model: IssueTypeDescription, as: "descriptions" }],
    });
    
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE issue type with descriptions ────────────────────────────────────────────
exports.updateIssueType = async (req, res) => {
  try {
    const issueType = await IssueType.findByPk(req.params.id);
    if (!issueType) return res.status(404).json({ success: false, message: "Issue Type not found" });

    const { issueType: newIssueType, descriptions, active } = req.body;
    
    if (newIssueType) {
      const existing = await IssueType.findOne({
        where: { issueType: newIssueType.trim(), id: { [Op.ne]: req.params.id } }
      });
      if (existing) return res.status(409).json({ success: false, message: `Issue Type "${newIssueType}" already exists` });
      await issueType.update({ issueType: newIssueType.trim(), active });
    } else {
      await issueType.update({ active });
    }
    
    // Update descriptions - delete old, create new
    if (descriptions !== undefined) {
      await IssueTypeDescription.destroy({ where: { issueTypeId: req.params.id } });
      
      if (descriptions.length > 0) {
        const descriptionRecords = descriptions.map(desc => ({
          issueTypeId: req.params.id,
          description: desc.trim(),
          active: true,
        }));
        await IssueTypeDescription.bulkCreate(descriptionRecords);
      }
    }
    
    // Fetch the updated record with descriptions
    const result = await IssueType.findByPk(req.params.id, {
      include: [{ model: IssueTypeDescription, as: "descriptions" }],
    });
    
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE issue type ────────────────────────────────────────────────────────────
exports.deleteIssueType = async (req, res) => {
  try {
    const issueType = await IssueType.findByPk(req.params.id);
    if (!issueType) return res.status(404).json({ success: false, message: "Issue Type not found" });
    
    // Descriptions will be deleted automatically due to CASCADE
    await issueType.destroy();
    res.status(200).json({ success: true, message: "Issue Type deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── TOGGLE active status ───────────────────────────────────────────────────────
exports.toggleIssueTypeStatus = async (req, res) => {
  try {
    const issueType = await IssueType.findByPk(req.params.id);
    if (!issueType) return res.status(404).json({ success: false, message: "Issue Type not found" });
    issueType.active = !issueType.active;
    await issueType.save();
    res.status(200).json({ success: true, data: issueType });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};