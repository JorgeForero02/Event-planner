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
    '/:empresaId',
    auth,
    auditoriaMiddleware('GET'),
    lugarController.obtenerLugaresEmpresa
);

router.get(
    '/:empresaId/:lugarId',
    auth,
    auditoriaMiddleware('GET'),
    lugarController.obtenerLugarById
);

router.put(
    '/:empresaId/:lugarId',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('PUT'),
    lugarController.actualizarLugar
);

router.delete(
    '/:empresaId/:lugarId',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('DELETE'),
    lugarController.eliminarLugar
);

module.exports = router;
