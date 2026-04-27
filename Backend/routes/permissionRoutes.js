const express = require("express");
const router = express.Router();
const permissionController = require("../controller/permissionController");

router.get("/", permissionController.getPermissions);
router.post("/", permissionController.updatePermission);

module.exports = router;
