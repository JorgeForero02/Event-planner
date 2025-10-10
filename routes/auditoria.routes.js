const express = require('express');
const router = express.Router();
const AuditoriaController = require('../controllers/auditoria.controller');

router.get('/', AuditoriaController.getAll);
router.get('/:id', AuditoriaController.getById);
router.post('/', AuditoriaController.create);
router.put('/:id', AuditoriaController.update);
router.delete('/:id', AuditoriaController.delete);

module.exports = router;
