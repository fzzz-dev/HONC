const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const hrEmployeeController = require('../../controller/hrms/hrEmployeeController');

// Configure multer for photo upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads/employees');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `emp_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Routes
router.get('/', hrEmployeeController.getAll);
router.get('/next-code', hrEmployeeController.getNextCode);
router.get('/export/csv', hrEmployeeController.exportToCSV);
router.get('/:id', hrEmployeeController.getById);

// Photo upload/delete routes
router.post('/:id/upload-photo', upload.single('photo'), hrEmployeeController.uploadPhoto);
router.delete('/:id/photo', hrEmployeeController.deletePhoto);

router.post('/', hrEmployeeController.create);
router.put('/:id', hrEmployeeController.update);
router.delete('/:id', hrEmployeeController.delete);
router.delete('/:id/permanent', hrEmployeeController.hardDelete);

module.exports = router;