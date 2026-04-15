const createCRUDController = (Model) => {
  return {
    // GET ALL
    getAll: async (req, res) => {
      try {
        const { search = "", page = 1, limit = 10 } = req.query;

        const query = search
          ? { name: { $regex: search, $options: "i" } }
          : {};

        const records = await Model.find(query)
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .sort({ createdAt: -1 });

        const total = await Model.countDocuments(query);

        res.json({ success: true, data: records, total });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    },

    // GET BY ID
    getById: async (req, res) => {
      try {
        const record = await Model.findById(req.params.id);
        if (!record)
          return res.status(404).json({ success: false, message: "Not found" });

        res.json({ success: true, data: record });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    },

    // CREATE
    create: async (req, res) => {
      try {
        const exists = await Model.findOne({ name: req.body.name });
        if (exists) {
          return res.status(400).json({
            success: false,
            message: "Already exists",
          });
        }

        const record = await Model.create(req.body);

        res.status(201).json({ success: true, data: record });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    },

    // UPDATE
    update: async (req, res) => {
      try {
        const record = await Model.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true, runValidators: true }
        );

        if (!record)
          return res.status(404).json({ success: false, message: "Not found" });

        res.json({ success: true, data: record });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    },

    // DELETE
    delete: async (req, res) => {
      try {
        await Model.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: "Deleted successfully" });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    },

    // ✅ ADD THIS (FIX)
    bulkCreate: async (req, res) => {
      try {
        const records = await Model.insertMany(req.body);

        res.status(201).json({
          success: true,
          data: records,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    },
  };
};

module.exports = createCRUDController;