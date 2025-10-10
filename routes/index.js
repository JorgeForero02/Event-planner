const express = require('express');
const router = express.Router();

router.use('/usuarios', require('./usuario.routes'));
router.use('/administradores', require('./administrador.routes'));
router.use('/asistentes', require('./asistente.routes'));
router.use('/ponentes', require('./ponente.routes'));
router.use('/empresas', require('./empresa.routes'));
router.use('/paises', require('./pais.routes'));
router.use('/ciudades', require('./ciudad.routes'));
router.use('/ubicaciones', require('./ubicacion.routes'));
router.use('/lugares', require('./lugar.routes'));
router.use('/eventos', require('./evento.routes'));
router.use('/actividades', require('./actividad.routes'));
router.use('/inscripciones', require('./inscripcion.routes'));
router.use('/asistencias', require('./asistencia.routes'));
router.use('/tipos-notificacion', require('./tiponotificacion.routes'));
router.use('/notificaciones', require('./notificacion.routes'));
router.use('/auditorias', require('./auditoria.routes'));

module.exports = router;
