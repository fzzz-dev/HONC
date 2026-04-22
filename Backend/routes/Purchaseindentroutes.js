// routes/Purchaseindentroutes.js
const express = require("express");
const router = express.Router();
const {
  getAll,
  getOne,
  getNextNumber,
  create,
  update,
  remove,
} = require("../controller/purchaseindentcontroller");


// ── IMPORTANT: /next-number BEFORE /:id ─────────────────────────────────────
router.get("/next-number", getNextNumber);

router.get("/",     getAll);
router.get("/:id",  getOne);
router.post("/",    create);
router.put("/:id",  update);
router.delete("/:id", remove);

module.exports = router;