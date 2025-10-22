const express = require('express');
const router = express.Router();
const gestion_usuarios = require('../controllers/gestion_usuarios.controller');
const { auth, isAdministrador, isGerenteOrAdmin } = require('../middlewares/auth');

router.get('/', auth, isAdministrador, gestion_usuarios.getAllUsersComplete);
router.get('/:id', auth, gestion_usuarios.getUserComplete);
router.put('/:id/profile', auth, gestion_usuarios.updateProfile);
router.put('/:id/role-data', auth, gestion_usuarios.updateRoleData);
router.put('/:id/company', auth, isGerenteOrAdmin, gestion_usuarios.changeCompany);
router.put('/:id/password', auth, gestion_usuarios.changePassword);
router.patch('/:id/status', auth, isAdministrador, gestion_usuarios.toggleUserStatus);

router.post('/', auth, isAdministrador, gestion_usuarios.createUser);

module.exports = router;
