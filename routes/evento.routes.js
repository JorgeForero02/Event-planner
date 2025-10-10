const express = require('express');
const router = express.Router();
const EventoController = require('../controllers/evento.controller');

router.get('/', EventoController.getAll);
router.get('/:id', EventoController.getById);
router.post('/', EventoController.create);
router.put('/:id', EventoController.update);
router.delete('/:id', EventoController.delete);

module.exports = router;
