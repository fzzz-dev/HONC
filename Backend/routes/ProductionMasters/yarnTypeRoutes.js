const express = require('express');
const router = express.Router();
const yarnTypeController = require('../../controller/ProductionMasters/yarnTypeController');

router.get('/active', yarnTypeController.getActive);
router.get('/export/csv', yarnTypeController.exportToCSV);
router.get('/:id', yarnTypeController.getById);
router.get('/', yarnTypeController.getAll);

router.post('/', yarnTypeController.create);
router.put('/:id', yarnTypeController.update);
router.delete('/:id', yarnTypeController.delete);
router.delete('/:id/permanent', yarnTypeController.hardDelete);

module.exports = router;