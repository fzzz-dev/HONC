const express = require("express");
const router = express.Router();
const {
  getAllIssueTypes,
  getIssueTypeById,
  createIssueType,
  updateIssueType,
  deleteIssueType,
  toggleIssueTypeStatus,
} = require("../controller/IssueTypeController");

router.route("/").get(getAllIssueTypes).post(createIssueType);
router.route("/:id").get(getIssueTypeById).put(updateIssueType).delete(deleteIssueType);
router.patch("/:id/toggle", toggleIssueTypeStatus);

module.exports = router;