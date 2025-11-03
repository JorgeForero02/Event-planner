const express = require('express');
const router = express.Router();
const InscripcionController = require('../controllers/inscripcion.controller');
const { auth, isOrganizadorOGerente } = require('../middlewares/auth');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');

router.get(
    '/eventos-disponibles',
    auth,
    InscripcionController.obtenerEventosDisponibles
);


router.post(
    '/',
    auth,
    auditoriaMiddleware('POST'),
    InscripcionController.inscribirEvento
);

router.get(
    '/mis-inscripciones',
    auth,
    InscripcionController.obtenerMisInscripciones
);

router.post(
    '/inscribir-equipo',
    auth,
    isOrganizadorOGerente, 
    auditoriaMiddleware('POST'),
    InscripcionController.inscribirEquipo
);

router.get(
    '/confirmar/:codigo',
    InscripcionController.confirmarInscripcion
);

module.exports = router;