const express = require('express');
const router = express.Router({ mergeParams: true });
const { auth, isOrganizadorOGerente } = require('../middlewares/auth');
const { verificarPermisoEdicionEvento } = require('../middlewares/verificarPermisos');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const actividadController = require('../controllers/actividad.controller');

router.post(
    '/',
    auth,
    isOrganizadorOGerente,
    verificarPermisoEdicionEvento,
    auditoriaMiddleware('POST'),
    actividadController.crearActividad
);

router.get(
    '/',
    auth,
    auditoriaMiddleware('GET'),
    actividadController.obtenerActividadesEvento
);

router.get(
    '/:actividadId',
    auth,
    auditoriaMiddleware('GET'),
    actividadController.obtenerActividadById
);

router.put(
    '/:actividadId',
    auth,
    isOrganizadorOGerente,
    verificarPermisoEdicionEvento,
    auditoriaMiddleware('PUT'),
    actividadController.actualizarActividad
);

router.delete(
    '/:actividadId',
    auth,
    isOrganizadorOGerente,
    verificarPermisoEdicionEvento,
    auditoriaMiddleware('DELETE'),
    actividadController.eliminarActividad
);

module.exports = router;
