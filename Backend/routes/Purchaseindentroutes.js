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
  updateIndentBalance
} = require("../controller/purchaseindentcontroller");


// ── IMPORTANT: /next-number BEFORE /:id ─────────────────────────────────────
router.get("/next-number", getNextNumber);

router.get("/",     getAll);
router.get("/:id",  getOne);
router.post("/",    create);
router.put("/:id",  update);
router.put('/update-balance/:indentDetailId', updateIndentBalance);
router.delete("/:id", remove);

module.exports = router;