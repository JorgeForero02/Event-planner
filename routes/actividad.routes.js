const express = require('express');
const router = express.Router();
const ActividadController = require('../controllers/actividad.controller');

router.get('/', ActividadController.getAll);
router.get('/:id', ActividadController.getById);
router.post('/', ActividadController.create);
router.put('/:id', ActividadController.update);
router.delete('/:id', ActividadController.delete);

module.exports = router;
