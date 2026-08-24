const express = require('express');
const router = express.Router();
const colorController = require('../../controller/ProductionMasters/colorController');

// Specific routes MUST come before parameter routes
router.get('/active', colorController.getActive);
router.get('/export/csv', colorController.exportToCSV);
router.get('/:id', colorController.getById);
router.get('/', colorController.getAll);

router.post('/', colorController.create);
router.put('/:id', colorController.update);
router.delete('/:id', colorController.delete);
router.delete('/:id/permanent', colorController.hardDelete);

module.exports = router;