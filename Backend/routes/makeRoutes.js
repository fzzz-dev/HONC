const express = require("express");
const router = express.Router();
const {
  getAllMakes,
  getMakeById,
  createMake,
  updateMake,
  deleteMake,
  toggleMakeStatus,
} = require("../controller/Makecontroller");


// GET    /api/makes           → list all (supports ?search= & ?active=)
// POST   /api/makes           → create new
router.route("/").get(getAllMakes).post(createMake);

// GET    /api/makes/:id       → get single
// PUT    /api/makes/:id       → full update
// DELETE /api/makes/:id       → delete
router.route("/:id").get(getMakeById).put(updateMake).delete(deleteMake);

// PATCH  /api/makes/:id/toggle → flip active flag
router.patch("/:id/toggle", toggleMakeStatus);

module.exports = router;