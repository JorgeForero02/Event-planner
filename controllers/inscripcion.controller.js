const InscripcionService = require('../services/inscripcion.service');
const InscripcionValidator = require('../validators/inscripcion.validator');
const EmailService = require('../services/emailService');
const AuditoriaService = require('../services/auditoriaService');
const ApiResponse = require('../utils/response');
const { MENSAJES } = require('../constants/inscripcion.constants');

class InscripcionController {
    async obtenerEventosDisponibles(req, res, next) {
        try {
            const { modalidad } = req.query;
            const eventos = await InscripcionService.obtenerEventosDisponibles(modalidad);

            return ApiResponse.success(res, eventos, MENSAJES.EVENTOS_DISPONIBLES_OBTENIDOS);
        } catch (error) {
            next(error);
        }
    }

    async inscribirEvento(req, res, next) {
        const transaction = await InscripcionService.crearTransaccion();

        try {
            const { id_evento } = req.body;
            const usuario = req.usuario;

            const resultado = await InscripcionService.inscribir(id_evento, usuario.id, transaction);

            if (!resultado.exito) {
                await transaction.rollback();
                return ApiResponse.error(res, resultado.mensaje, resultado.codigoEstado);
            }

            await AuditoriaService.registrarCreacion('inscripcion', {
                id: resultado.inscripcion.id,
                evento: resultado.evento.titulo,
                asistente: usuario.nombre
            }, usuario);

            try {
                await EmailService.enviarConfirmacionInscripcion(
                    usuario.correo,
                    usuario.nombre,
                    resultado.evento.titulo,
                    resultado.evento.fecha_inicio,
                    resultado.inscripcion.codigo
                );
            } catch (emailError) {
                console.error('Error enviando correo de confirmación:', emailError);
            }

            await transaction.commit();

            return ApiResponse.success(res, resultado.inscripcion, MENSAJES.INSCRIPCION_EXITOSA, 201);
        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    }

    async obtenerMisInscripciones(req, res, next) {
        try {
            const usuarioId = req.usuario.id;
            const inscripciones = await InscripcionService.obtenerPorUsuario(usuarioId);

            return ApiResponse.success(res, inscripciones, MENSAJES.MIS_INSCRIPCIONES_OBTENIDAS);
        } catch (error) {
            next(error);
        }
    }

    async inscribirEquipo(req, res, next) {
        const transaction = await InscripcionService.crearTransaccion();

        try {
            const { id_evento, cedulas = [] } = req.body;
            const gerente = req.usuario;

            const validacion = InscripcionValidator.validarInscripcionEquipo(id_evento, cedulas);

            if (!validacion.esValida) {
                return ApiResponse.error(res, validacion.mensaje, 400);
            }

            const resultado = await InscripcionService.inscribirEquipo(
                id_evento,
                cedulas,
                gerente,
                transaction
            );

            if (!resultado.exito) {
                await transaction.rollback();
                return ApiResponse.error(res, resultado.mensaje, resultado.codigoEstado);
            }

            await transaction.commit();

            return ApiResponse.success(res, resultado.resultados, MENSAJES.PROCESO_INSCRIPCION_FINALIZADO);
        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    }

    async confirmarInscripcion(req, res, next) {
        const transaction = await InscripcionService.crearTransaccion();

        try {
            const { codigo } = req.params;

            const resultado = await InscripcionService.confirmarPorCodigo(codigo, transaction);

            if (!resultado.exito) {
                await transaction.rollback();
                return ApiResponse.error(res, resultado.mensaje, resultado.codigoEstado);
            }

            await transaction.commit();

            return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Confirmación de Asistencia</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1>¡Gracias!</h1>
          <p>Tu asistencia al evento</p>
          <h2>${resultado.evento.titulo}</h2>
          <p>ha sido confirmada.</p>
        </body>
        </html>
      `);
        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    }
}

module.exports = new InscripcionController();
