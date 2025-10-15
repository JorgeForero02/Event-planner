const express = require('express');
const router = express.Router();
const {
    login,
    register,
    promoverAGerente,
    crearOrganizador,
    refresh,
    getProfile
} = require('../controllers/auth.controller');
const { auth, isAdministrador, isGerenteOrAdmin } = require('../middlewares/auth');

// Rutas publicas
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// Rutas protegidas
router.get('/profile', auth, getProfile);

// Solo administrador del sistema puede promover a gerente
router.post('/promover-gerente', auth, isAdministrador, promoverAGerente);

// Gerente o administrador pueden crear organizadores
router.post('/crear-organizador', auth, isGerenteOrAdmin, crearOrganizador);

module.exports = router;
