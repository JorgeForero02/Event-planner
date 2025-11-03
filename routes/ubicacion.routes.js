const express = require('express');
const router = express.Router(); 
const { auth, isOrganizadorOGerente, isAdministrador, isAdminGerenteOrOrganizador } = require('../middlewares/auth'); // <-- Se añade isAdminGerenteOrOrganizador
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const ubicacionController = require('../controllers/ubicacion.controller');

router.get(
    '/:ubicacionId', 
    auth,
    isAdminGerenteOrOrganizador, 
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