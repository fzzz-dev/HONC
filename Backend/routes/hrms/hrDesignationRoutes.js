const express = require("express");
const router = express.Router();
const hrDesignationController = require("../../controller/hrms/hrDesignationController");

// Main CRUD routes
router.route("/")
  .get(hrDesignationController.getAll)
  .post(hrDesignationController.create);

router.route("/:id")
  .get(hrDesignationController.getById)
  .put(hrDesignationController.update)
  .delete(hrDesignationController.delete);

// Get designations by department (now directly linked)
router.get("/by-department/:departmentId", hrDesignationController.getByDepartment);

// Export to CSV
router.get("/export/csv", hrDesignationController.exportToCSV);

// Hard delete
router.delete("/:id/permanent", hrDesignationController.hardDelete);


module.exports = router;