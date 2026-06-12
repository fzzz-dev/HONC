const express = require("express");
const router = express.Router();
const consumptionIssueController = require("../controller/consumptionIssueController");
const consumptionIssueReportController = require("../controller/consumptionIssueReportController");

// ==================== CONSUMPTION ISSUE REPORT ROUTES ====================
router.get('/consumption-issue-report', consumptionIssueReportController.getConsumptionIssueReport);
router.get('/consumption-issue-report/export/csv', consumptionIssueReportController.exportConsumptionIssueReportCSV);
router.get('/consumption-issue-report/departments', consumptionIssueReportController.getDistinctDepartments);
router.get('/consumption-issue-report/stores', consumptionIssueReportController.getDistinctStores);

// ==================== CRUD ROUTES ====================
router.get("/", consumptionIssueController.getAllConsumptionIssues);
router.get("/next-no", consumptionIssueController.getNextNumber);
router.get("/:id", consumptionIssueController.getConsumptionIssueById);
router.post("/", consumptionIssueController.createConsumptionIssue);
router.put("/:id", consumptionIssueController.updateConsumptionIssue);
router.delete("/:id", consumptionIssueController.deleteConsumptionIssue);

module.exports = router;