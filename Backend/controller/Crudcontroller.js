const { Op } = require("sequelize");

const createCRUDController = (Model) => {
  return {
    // GET ALL
    getAll: async (req, res) => {
      try {
        const { search = "", page = 1, limit = 10, active } = req.query;

        const where = {};
        if (search) {
          where.name = { [Op.like]: `%${search}%` };
        }
        if (active !== undefined) {
          where.active = active === "true";
        }

        const { count, rows } = await Model.findAndCountAll({
          where,
          offset: (page - 1) * limit,
          limit: Number(limit),
          order: [["createdAt", "DESC"]],
        });

        res.json({ success: true, data: rows, total: count });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    },

    // GET BY ID
    getById: async (req, res) => {
      try {
        const record = await Model.findByPk(req.params.id);
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
        if (req.body.name) {
          const exists = await Model.findOne({ where: { name: req.body.name } });
          if (exists) {
            return res.status(400).json({
              success: false,
              message: "Already exists",
            });
          }
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
        const record = await Model.findByPk(req.params.id);
        if (!record)
          return res.status(404).json({ success: false, message: "Not found" });

        await record.update(req.body);
        res.json({ success: true, data: record });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    },

    // DELETE
    delete: async (req, res) => {
      try {
        const record = await Model.findByPk(req.params.id);
        if (!record)
          return res.status(404).json({ success: false, message: "Not found" });

        await record.destroy();
        res.json({ success: true, message: "Deleted successfully" });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    },

    // BULK CREATE
    bulkCreate: async (req, res) => {
      try {
        const records = await Model.bulkCreate(req.body);
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