const express = require('express');
const router = express.Router();
const AsistenciaController = require('../controllers/asistencia.controller');

router.get('/', AsistenciaController.getAll);
router.get('/:id', AsistenciaController.getById);
router.post('/', AsistenciaController.create);
router.put('/:id', AsistenciaController.update);
router.delete('/:id', AsistenciaController.delete);

module.exports = router;
