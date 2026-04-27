const express = require("express");
const router = express.Router();
const roleController = require("../controller/roleController");

router.get("/", roleController.getAllRoles);
router.post("/", roleController.createRole);
router.delete("/:id", roleController.deleteRole);

module.exports = router;
