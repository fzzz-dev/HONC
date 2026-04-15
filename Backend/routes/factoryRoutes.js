const express = require("express");

// Generic route creator
const createRoutes = (controller) => {
  const router = express.Router();

  router.get("/", controller.getAll);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.delete);
  router.post("/bulk", controller.bulkCreate);

  return router;
};

module.exports = createRoutes;
