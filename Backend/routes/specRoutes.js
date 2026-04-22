const express = require("express");
const router = express.Router();
const {
  getAllSpecs,
  getSpecById,
  createSpec,
  updateSpec,
  deleteSpec,
  toggleSpecStatus,
} = require("../controller/Speccontroller");


// GET    /api/specs           → list all (supports ?search= & ?active=)
// POST   /api/specs           → create new
router.route("/").get(getAllSpecs).post(createSpec);

// GET    /api/specs/:id       → get single
// PUT    /api/specs/:id       → full update
// DELETE /api/specs/:id       → delete
router.route("/:id").get(getSpecById).put(updateSpec).delete(deleteSpec);

// PATCH  /api/specs/:id/toggle → flip active flag
router.patch("/:id/toggle", toggleSpecStatus);

module.exports = router;
