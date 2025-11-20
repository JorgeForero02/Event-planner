const express = require('express');
const router = express.Router();
const { auth, isOrganizadorOGerente } = require('../middlewares/auth');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const {
    verificarPermisoEvento,
    verificarPermisoEdicionEvento
} = require('../middlewares/verificarPermisos');
const eventoController = require('../controllers/evento.controller');

const actividadController = require('../controllers/actividad.controller');

// POST - Crear evento
router.post('/', auth, isOrganizadorOGerente, verificarPermisoEvento, auditoriaMiddleware('POST'), eventoController.crearEvento);

// GET - Obtener todos los eventos
router.get('/', auth, auditoriaMiddleware('GET'), eventoController.obtenerEventos);


// GET - Obtener evento por ID
router.get('/:eventoId', auth, auditoriaMiddleware('GET'), eventoController.obtenerEventoById);

// PUT - Actualizar evento
router.put('/:eventoId', auth, isOrganizadorOGerente, verificarPermisoEdicionEvento, auditoriaMiddleware('PUT'), eventoController.actualizarEvento);

// DELETE - Eliminar evento (cancelar)
router.delete('/:eventoId', auth, isOrganizadorOGerente, verificarPermisoEdicionEvento, auditoriaMiddleware('DELETE'), eventoController.eliminarEvento);

// --- RUTAS ANIDADAS PARA ACTIVIDADES ---
router.post(
    '/:eventoId/actividades',
    auth,
    isOrganizadorOGerente,
    verificarPermisoEdicionEvento, 
    auditoriaMiddleware('POST'),
    actividadController.crearActividad
);

router.get(
    '/:eventoId/actividades',
    auth,
    auditoriaMiddleware('GET'),
    actividadController.obtenerActividadesPorEvento
);

module.exports = router;
