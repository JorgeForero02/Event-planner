const express = require('express');
const router = express.Router();
const AsistenciaController = require('../controllers/asistencia.controller');
const { auth, isOrganizadorOGerente } = require('../middlewares/auth');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');

router.post('/', auth, auditoriaMiddleware('POST'), AsistenciaController.registrarAsistencia);

router.post('/codigo', auth, auditoriaMiddleware('POST'), AsistenciaController.registrarAsistenciaPorCodigo);

router.get('/mis-asistencias', auth, AsistenciaController.obtenerMisAsistencias);

router.get('/evento/:id_evento', auth, isOrganizadorOGerente, AsistenciaController.obtenerAsistenciasEvento);

module.exports = router;
