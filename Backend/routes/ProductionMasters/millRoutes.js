const express = require('express');
const router = express.Router();
const millController = require('../../controller/ProductionMasters/millController');

router.get('/active', millController.getActive);
router.get('/export/csv', millController.exportToCSV);
router.get('/:id', millController.getById);
router.get('/', millController.getAll);

router.post('/', millController.create);
router.put('/:id', millController.update);
router.delete('/:id', millController.delete);
router.delete('/:id/permanent', millController.hardDelete);

module.exports = router;