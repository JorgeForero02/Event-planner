const express = require('express');
const router = express.Router();
const PonenteActividadController = require('../controllers/ponenteActividad.controller');
const { auth, isOrganizadorOGerente, isAdminGerenteOrOrganizador } = require('../middlewares/auth');

router.post('/', auth, isAdminGerenteOrOrganizador, PonenteActividadController.asignarPonente);

router.get('/actividad/:actividadId', auth, isAdminGerenteOrOrganizador, PonenteActividadController.obtenerPorActividad);

router.get('/ponente/:ponenteId', auth, isAdminGerenteOrOrganizador, PonenteActividadController.obtenerPorPonente);

router.get('/:ponenteId/:actividadId', auth, isAdminGerenteOrOrganizador, PonenteActividadController.obtenerAsignacion);

router.post('/:ponenteId/:actividadId/solicitar-cambio', auth, isOrganizadorOGerente, PonenteActividadController.solicitarCambio);

router.put('/:ponenteId/:actividadId/procesar-solicitud', auth, isAdminGerenteOrOrganizador, PonenteActividadController.procesarSolicitud);

router.put('/:ponenteId/:actividadId', auth, isAdminGerenteOrOrganizador, PonenteActividadController.actualizarAsignacion);

router.delete('/:ponenteId/:actividadId', auth, isAdminGerenteOrOrganizador, PonenteActividadController.eliminarAsignacion);

module.exports = router;
