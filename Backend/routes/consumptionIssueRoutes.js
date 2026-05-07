const express = require("express");
const router = express.Router();
const controller = require("../controller/consumptionIssueController");

router.get("/", controller.getAllConsumptionIssues);
router.get("/next-no", controller.getNextNumber);
router.get("/:id", controller.getConsumptionIssueById);

router.post("/", controller.createConsumptionIssue);
router.put("/:id", controller.updateConsumptionIssue);
router.delete("/:id", controller.deleteConsumptionIssue);

module.exports = router;
