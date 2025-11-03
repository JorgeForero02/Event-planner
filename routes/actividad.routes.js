const express = require('express');
const router = express.Router(); 
const { auth, isOrganizadorOGerente } = require('../middlewares/auth');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const actividadController = require('../controllers/actividad.controller');

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
    auditoriaMiddleware('PUT'),
    actividadController.actualizarActividad
);

router.delete(
    '/:actividadId',
    auth,
    isOrganizadorOGerente, 
    auditoriaMiddleware('DELETE'),
    actividadController.eliminarActividad
);

module.exports = router;