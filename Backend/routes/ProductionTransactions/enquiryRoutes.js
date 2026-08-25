const express = require("express");
const router = express.Router();

const {
    getAll,
    getOne,
    getNextNumber,
    create,
    update,
    remove
} = require("../../controller/ProductionTransactions/enquiryController");

router.get("/next-number", getNextNumber);
router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;