const express = require('express');
const router = express.Router();
const countsController = require('../../controller/ProductionMasters/countsController');

router.get('/active', countsController.getActive);
router.get('/export/csv', countsController.exportToCSV);
router.get('/:id', countsController.getById);
router.get('/', countsController.getAll);

router.post('/', countsController.create);
router.put('/:id', countsController.update);
router.delete('/:id', countsController.delete);
router.delete('/:id/permanent', countsController.hardDelete);

module.exports = router;