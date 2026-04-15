const State = require("../model/state");

// GET ALL (with country populated)
exports.getStates = async (req, res) => {
  try {
    const states = await State.find()
      .populate("country", "name")
      .sort({ createdAt: -1 });

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
    const { name, country } = req.body;

    // 🔥 duplicate check inside same country
    const exists = await State.findOne({ name, country });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "State already exists in this country",
      });
    }

    const state = await State.create(req.body);

    const populated = await state.populate("country", "name");

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
    const state = await State.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("country", "name");

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    res.json({
      success: true,
      data: state,
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
    await State.findByIdAndDelete(req.params.id);

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