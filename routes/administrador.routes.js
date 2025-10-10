const express = require('express');
const router = express.Router();
const AdministradorController = require('../controllers/administrador.controller');

router.get('/', AdministradorController.getAll);
router.get('/:id', AdministradorController.getById);
router.post('/', AdministradorController.create);
router.put('/:id', AdministradorController.update);
router.delete('/:id', AdministradorController.delete);

module.exports = router;
