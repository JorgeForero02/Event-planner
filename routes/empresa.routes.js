const express = require('express');
const router = express.Router();
const EmpresaController = require('../controllers/empresa.controller');
const { auth, isAdministrador, isGerenteOrAdmin, isAdminGerenteOrOrganizador } = require('../middlewares/auth');

router.get('/', auth, isAdminGerenteOrOrganizador, EmpresaController.getAll);
router.get('/:id', auth, isAdminGerenteOrOrganizador, EmpresaController.getById);
router.post('/', auth, isAdministrador, EmpresaController.create);
router.put('/:id', auth, isAdministrador, EmpresaController.update);
router.delete('/:id', auth, isAdministrador, EmpresaController.delete);
router.get('/:id/equipo', auth, isAdminGerenteOrOrganizador, EmpresaController.getEquipo);

module.exports = router;
