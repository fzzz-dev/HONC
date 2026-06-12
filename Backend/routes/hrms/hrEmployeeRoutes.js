// routes/hrms/hrEmployeeRoutes.js
const express = require('express');
const router = express.Router();
const hrEmployeeController = require('../../controller/hrms/hrEmployeeController');

router.get('/', hrEmployeeController.getAll);
router.get('/next-code', hrEmployeeController.getNextCode);
router.get('/export/csv', hrEmployeeController.exportToCSV);
router.get('/:id', hrEmployeeController.getById);


router.post('/', hrEmployeeController.create);
router.put('/:id', hrEmployeeController.update);
router.delete('/:id', hrEmployeeController.delete);
router.delete('/:id/permanent', hrEmployeeController.hardDelete);

module.exports = router;