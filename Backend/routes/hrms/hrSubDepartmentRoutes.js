const express = require("express");
const router = express.Router();
const hrSubDepartmentController = require("../../controller/hrms/hrSubDepartmentController");

router.route("/").get(hrSubDepartmentController.getAll).post(hrSubDepartmentController.create);
router.route("/:id").get(hrSubDepartmentController.getById).put(hrSubDepartmentController.update).delete(hrSubDepartmentController.delete);
router.get("/by-department/:departmentId", hrSubDepartmentController.getByDepartment);
router.get("/export/csv", hrSubDepartmentController.exportToCSV);
router.delete("/:id/permanent", hrSubDepartmentController.hardDelete);

module.exports = router;
