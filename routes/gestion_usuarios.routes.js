const express = require('express');
const router = express.Router();
const gestion_usuarios = require('../controllers/gestion_usuarios.controller');
const { auth, isAdministrador, isGerenteOrAdmin } = require('../middlewares/auth');

router.get('/users', auth, isAdministrador, gestion_usuarios.getAllUsersComplete);
router.get('/users/:id', auth, gestion_usuarios.getUserComplete);
router.put('/users/:id/profile', auth, gestion_usuarios.updateProfile);
router.put('/users/:id/role-data', auth, gestion_usuarios.updateRoleData);
router.put('/users/:id/company', auth, isGerenteOrAdmin, gestion_usuarios.changeCompany);
router.put('/users/:id/password', auth, gestion_usuarios.changePassword);
router.patch('/users/:id/status', auth, isAdministrador, gestion_usuarios.toggleUserStatus);

router.post('/users', auth, isAdministrador, gestion_usuarios.createUser);

module.exports = router;
