const express = require('express');
const router = express.Router();
const hrDepartmentController = require('../../controller/hrms/hrDepartmentController');

// Specific routes MUST come before parameter routes
router.get('/active', hrDepartmentController.getActive);
router.get('/export/csv', hrDepartmentController.exportToCSV);
router.get('/:id', hrDepartmentController.getById);
router.get('/', hrDepartmentController.getAll);

router.post('/', hrDepartmentController.create);
router.put('/:id', hrDepartmentController.update);
router.delete('/:id', hrDepartmentController.delete);
router.delete('/:id/permanent', hrDepartmentController.hardDelete);

module.exports = router;