const express = require('express');
const router = express.Router({ mergeParams: true });
const { auth, isOrganizadorOGerente, isAdministrador } = require('../middlewares/auth');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const ubicacionController = require('../controllers/ubicacion.controller');

router.post(
    '/',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('POST'),
    ubicacionController.crearUbicacion
);

router.get(
    '/',
    auth,
    auditoriaMiddleware('GET'),
    ubicacionController.obtenerUbicacionesEmpresa
);

router.get(
    '/:ubicacionId',
    auth,
    auditoriaMiddleware('GET'),
    ubicacionController.obtenerUbicacionById
);

router.put(
    '/:ubicacionId',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('PUT'),
    ubicacionController.actualizarUbicacion
);

router.delete(
    '/:ubicacionId',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('DELETE'),
    ubicacionController.eliminarUbicacion
);

module.exports = router;
