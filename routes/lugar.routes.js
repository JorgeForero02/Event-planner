const express = require('express');
const router = express.Router({ mergeParams: true });
const { auth, isOrganizadorOGerente } = require('../middlewares/auth');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const lugarController = require('../controllers/lugar.controller');

router.post(
    '/',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('POST'),
    lugarController.crearLugar
);

router.get(
    '/',
    auth,
    auditoriaMiddleware('GET'),
    lugarController.obtenerLugaresEmpresa
);

router.get(
    '/:lugarId',
    auth,
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
