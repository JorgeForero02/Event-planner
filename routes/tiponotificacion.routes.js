const express = require('express');
const router = express.Router();
const TipoNotificacionController = require('../controllers/tiponotificacion.controller');

router.get('/', TipoNotificacionController.getAll);
router.get('/:id', TipoNotificacionController.getById);
router.post('/', TipoNotificacionController.create);
router.put('/:id', TipoNotificacionController.update);
router.delete('/:id', TipoNotificacionController.delete);

module.exports = router;
