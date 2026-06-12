const express = require("express");
const router = express.Router();
const hrDesignationController = require("../../controller/hrms/hrDesignationController");

router.route("/").get(hrDesignationController.getAll).post(hrDesignationController.create);
router.route("/:id").get(hrDesignationController.getById).put(hrDesignationController.update).delete(hrDesignationController.delete);
router.get("/by-sub-department/:subDepartmentId", hrDesignationController.getBySubDepartment);
router.get("/export/csv", hrDesignationController.exportToCSV);
router.get('/by-department/:departmentId', hrDesignationController.getByDepartment);
router.delete("/:id/permanent", hrDesignationController.hardDelete);

module.exports = router;
