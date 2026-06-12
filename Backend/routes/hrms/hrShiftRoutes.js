const express = require("express");
const router = express.Router();
const hrShiftController = require("../../controller/hrms/hrShiftController");

router.route("/").get(hrShiftController.getAll).post(hrShiftController.create);
router.route("/:id").get(hrShiftController.getById).put(hrShiftController.update).delete(hrShiftController.delete);
router.get("/active", hrShiftController.getActive);
router.get("/export/csv", hrShiftController.exportToCSV);
router.delete("/:id/permanent", hrShiftController.hardDelete);

module.exports = router;
