const express = require("express");
const router = express.Router();
const itemController = require("../controller/Itemcontroller");


const { upload } = itemController;
const { bulkUploadMiddleware } = itemController;

// All routes use upload.single("image") so multipart/form-data is supported
// JSON body still works when no file is uploaded
router.get("/", itemController.getAll);
router.get("/template", itemController.downloadTemplate);
router.post(
  "/bulk-upload",
  bulkUploadMiddleware.single("file"),
  itemController.bulkUpload,
);
router.get("/:id", itemController.getOne);
router.post("/", upload.single("image"), itemController.create);
router.put("/:id", upload.single("image"), itemController.update);
router.delete("/:id", itemController.remove);

module.exports = router;