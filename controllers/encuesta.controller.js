const EncuestaService = require('../services/encuesta.service');
const AuditoriaService = require('../services/auditoriaService');
const EmailService = require('../services/emailService');
const { MENSAJES, CODIGOS_HTTP } = require('../constants/encuesta.constants');

class EncuestaController {
    async crearEncuesta(req, res) {
        const transaction = await EncuestaService.crearTransaccion();
        try {
            const usuario = req.usuario;
            const datosEncuesta = req.body;

            // Validar que tenga al menos un evento o actividad
            if (!datosEncuesta.id_evento && !datosEncuesta.id_actividad) {
                await transaction.rollback();
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: 'Debe asociar la encuesta a un evento o actividad'
                });
            }

            const encuesta = await EncuestaService.crear(datosEncuesta, transaction);

            await AuditoriaService.registrar({
                mensaje: `Se creó la encuesta: ${encuesta.titulo}`,
                tipo: 'POST',
                accion: 'crear_encuesta',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.status(CODIGOS_HTTP.CREADO).json({
                success: true,
                message: MENSAJES.CREADA,
                data: encuesta
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al crear encuesta:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_CREAR,
                error: error.message
            });
        }
    }

    async obtenerEncuestas(req, res) {
        try {
            const { evento_id, actividad_id } = req.query;
            let encuestas;

            if (evento_id) {
                encuestas = await EncuestaService.obtenerPorEvento(evento_id);
            } else if (actividad_id) {
                encuestas = await EncuestaService.obtenerPorActividad(actividad_id);
            } else {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: 'Debe especificar evento_id o actividad_id'
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.LISTA_OBTENIDA,
                total: encuestas.length,
                data: encuestas
            });
        } catch (error) {
            console.error('Error al obtener encuestas:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async obtenerEncuestaPorId(req, res) {
        try {
            const { encuestaId } = req.params;
            const encuesta = await EncuestaService.buscarPorId(encuestaId);

            if (!encuesta) {
                return res.status(CODIGOS_HTTP.NOT_FOUND).json({
                    success: false,
                    message: MENSAJES.NO_ENCONTRADA
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.OBTENIDA,
                data: encuesta
            });
        } catch (error) {
            console.error('Error al obtener encuesta:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async actualizarEncuesta(req, res) {
        const transaction = await EncuestaService.crearTransaccion();
        try {
            const { encuestaId } = req.params;
            const datosActualizacion = req.body;
            const usuario = req.usuario;

            const encuesta = await EncuestaService.actualizar(
                encuestaId,
                datosActualizacion,
                transaction
            );

            await AuditoriaService.registrar({
                mensaje: `Se actualizó la encuesta: ${encuesta.titulo}`,
                tipo: 'PUT',
                accion: 'actualizar_encuesta',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.ACTUALIZADA,
                data: encuesta
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar encuesta:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_ACTUALIZAR,
                error: error.message
            });
        }
    }

    async eliminarEncuesta(req, res) {
        const transaction = await EncuestaService.crearTransaccion();
        try {
            const { encuestaId } = req.params;
            const usuario = req.usuario;

            const encuesta = await EncuestaService.buscarPorId(encuestaId);

            if (!encuesta) {
                await transaction.rollback();
                return res.status(CODIGOS_HTTP.NOT_FOUND).json({
                    success: false,
                    message: MENSAJES.NO_ENCONTRADA
                });
            }

            await EncuestaService.eliminar(encuestaId, transaction);

            await AuditoriaService.registrar({
                mensaje: `Se eliminó la encuesta: ${encuesta.titulo}`,
                tipo: 'DELETE',
                accion: 'eliminar_encuesta',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.ELIMINADA
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al eliminar encuesta:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_ELIMINAR,
                error: error.message
            });
        }
    }

    async enviarEncuesta(req, res) {
        const transaction = await EncuestaService.crearTransaccion();
        try {
            const { encuestaId } = req.params;
            const usuario = req.usuario;

            const envios = await EncuestaService.enviarEncuestasMasivas(
                encuestaId,
                transaction
            );

            // Enviar emails con las URLs personalizadas
            transaction.afterCommit(async () => {
                try {
                    for (const envio of envios) {
                        await EmailService.enviarEncuesta(
                            envio.asistente.correo,
                            envio.asistente.nombre,
                            envio.url
                        );
                    }
                } catch (emailError) {
                    console.error('Error al enviar emails de encuesta:', emailError);
                }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.ENVIADA,
                data: {
                    total_enviadas: envios.length,
                    asistentes: envios.map(e => e.asistente)
                }
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al enviar encuesta:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_ENVIAR,
                error: error.message
            });
        }
    }

    async completarEncuesta(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: 'Token requerido'
                });
            }

            const respuesta = await EncuestaService.marcarComoCompletada(token);

            return res.json({
                success: true,
                message: MENSAJES.COMPLETADA,
                data: respuesta
            });
        } catch (error) {
            console.error('Error al completar encuesta:', error);

            if (error.message === 'Token inválido') {
                return res.status(CODIGOS_HTTP.NOT_FOUND).json({
                    success: false,
                    message: MENSAJES.TOKEN_INVALIDO
                });
            }

            if (error.message === 'La encuesta ya fue completada') {
                return res.status(CODIGOS_HTTP.CONFLICT).json({
                    success: false,
                    message: MENSAJES.YA_COMPLETADA
                });
            }

            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_COMPLETAR,
                error: error.message
            });
        }
    }

    async obtenerEstadisticas(req, res) {
        try {
            const { encuestaId } = req.params;

            const estadisticas = await EncuestaService.obtenerEstadisticas(encuestaId);

            return res.json({
                success: true,
                message: MENSAJES.ESTADISTICAS_OBTENIDAS,
                data: estadisticas
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }
}

module.exports = new EncuestaController();
