const express = require('express');
const router = express.Router();
const AsistenteController = require('../controllers/asistente.controller');

router.get('/', AsistenteController.getAll);
router.get('/:id', AsistenteController.getById);
router.post('/', AsistenteController.create);
router.put('/:id', AsistenteController.update);
router.delete('/:id', AsistenteController.delete);

module.exports = router;
