const PaymentTerm = require("../model/paymentTerm");

function normalizeBody(body) {
  const name = String(body.name ?? "").trim();
  const advancePct =
    body.advancePct === "" || body.advancePct === undefined
      ? 0
      : Number(body.advancePct);
  const balanceDueDays =
    body.balanceDueDays === "" || body.balanceDueDays === undefined
      ? 0
      : parseInt(body.balanceDueDays, 10);
  const active =
    body.active === undefined ? true : Boolean(body.active);
  return {
    name,
    advancePct: Number.isFinite(advancePct) ? advancePct : 0,
    balanceDueDays: Number.isFinite(balanceDueDays) ? balanceDueDays : 0,
    active,
  };
}

exports.getAll = async (req, res) => {
  try {
    const rows = await PaymentTerm.findAll({
      order: [["name", "ASC"]],
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const row = await PaymentTerm.findByPk(req.params.id);
    if (!row)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const p = normalizeBody(req.body);
    if (!p.name)
      return res
        .status(400)
        .json({ success: false, message: "Payment Terms Name is required" });
    const row = await PaymentTerm.create(p);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "A payment term with this name already exists",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await PaymentTerm.findByPk(req.params.id);
    if (!row)
      return res.status(404).json({ success: false, message: "Not found" });
    const p = normalizeBody({ ...row.get({ plain: true }), ...req.body });
    if (!p.name)
      return res
        .status(400)
        .json({ success: false, message: "Payment Terms Name is required" });
    await row.update(p);
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "A payment term with this name already exists",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const row = await PaymentTerm.findByPk(req.params.id);
    if (!row)
      return res.status(404).json({ success: false, message: "Not found" });
    await row.destroy();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
