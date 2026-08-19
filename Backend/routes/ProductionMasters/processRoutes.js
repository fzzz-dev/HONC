const express = require('express');
const router = express.Router();
const processController = require('../../controller/ProductionMasters/processController');

router.get('/active', processController.getActive);
router.get('/export/csv', processController.exportToCSV);
router.get('/:id', processController.getById);
router.get('/', processController.getAll);

router.post('/', processController.create);
router.put('/:id', processController.update);
router.delete('/:id', processController.delete);
router.delete('/:id/permanent', processController.hardDelete);

module.exports = router;