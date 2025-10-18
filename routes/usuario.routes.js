const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuario.controller');
const { auth, isAdministrador } = require('../middlewares/auth');

router.get('/', isAdministrador, UsuarioController.getAll);
router.get('/:id', isAdministrador, UsuarioController.getById);
router.post('/', isAdministrador, UsuarioController.create);
router.put('/:id',  UsuarioController.update);
router.delete('/:id', isAdministrador, UsuarioController.delete);

module.exports = router;
