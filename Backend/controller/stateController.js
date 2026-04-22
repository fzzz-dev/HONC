const State = require("../model/state");
const Country = require("../model/country");
const { Op } = require("sequelize");

// GET ALL (with country joined)
exports.getStates = async (req, res) => {
  try {
    const states = await State.findAll({
      include: [{ model: Country, as: "country", attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: states,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// CREATE
exports.createState = async (req, res) => {
  try {
    const { name, countryId } = req.body;

    const exists = await State.findOne({
      where: { name, countryId }
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "State already exists in this country",
      });
    }

    const state = await State.create(req.body);
    const populated = await State.findByPk(state.id, {
      include: [{ model: Country, as: "country", attributes: ["id", "name"] }]
    });

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
exports.updateState = async (req, res) => {
  try {
    const state = await State.findByPk(req.params.id);
    if (!state) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    await state.update(req.body);
    const populated = await State.findByPk(state.id, {
      include: [{ model: Country, as: "country", attributes: ["id", "name"] }]
    });

    res.json({
      success: true,
      data: populated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
exports.deleteState = async (req, res) => {
  try {
    const state = await State.findByPk(req.params.id);
    if (!state) return res.status(404).json({ success: false, message: "Not found" });
    await state.destroy();
    res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};