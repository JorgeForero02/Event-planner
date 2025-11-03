const express = require('express');
const router = express.Router(); 
const { auth, isOrganizadorOGerente, isAdminGerenteOrOrganizador } = require('../middlewares/auth');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const lugarController = require('../controllers/lugar.controller');

router.get(
    '/:lugarId', 
    auth,
    isAdminGerenteOrOrganizador,
    auditoriaMiddleware('GET'),
    lugarController.obtenerLugarById
);

router.put(
    '/:lugarId', 
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('PUT'),
    lugarController.actualizarLugar
);

router.delete(
    '/:lugarId',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('DELETE'),
    lugarController.eliminarLugar
);

module.exports = router;