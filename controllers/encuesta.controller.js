const EncuestaService = require('../services/encuesta.service');
const AuditoriaService = require('../services/auditoriaService');
const EmailService = require('../services/emailService');
const { Asistente, Evento, Actividad, Ponente, PonenteActividad, RespuestaEncuesta } = require('../models');
const { MENSAJES, CODIGOS_HTTP } = require('../constants/encuesta.constants');

class EncuestaController {
    async crearEncuesta(req, res) {
        const transaction = await EncuestaService.crearTransaccion();
        try {
            const usuario = req.usuario;
            const datosEncuesta = req.body;

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
            const { evento_id, actividad_id, ponente_id } = req.query;
            const { adminEmpresa } = req;
            const usuario = req.usuario;

            console.log('Usuario en obtenerEncuestas:', usuario);
            console.log(adminEmpresa);

            if (adminEmpresa) {
                const idEmpresaUsuario = adminEmpresa.id_empresa;

                if (evento_id) {
                    const evento = await Evento.findByPk(evento_id, { attributes: ['id_empresa'] });
                    if (!evento || evento.id_empresa !== idEmpresaUsuario) {
                        return res.status(403).json({
                            success: false,
                            message: 'Acceso denegado. El evento no pertenece a tu empresa.'
                        });
                    }
                }

                if (actividad_id) {
                    const actividad = await Actividad.findByPk(actividad_id, {
                        include: { model: Evento, as: 'evento', attributes: ['id_empresa'] }
                    });
                    if (!actividad || !actividad.evento || actividad.evento.id_empresa !== idEmpresaUsuario) {
                        return res.status(403).json({
                            success: false,
                            message: 'Acceso denegado. La actividad no pertenece a un evento de tu empresa.'
                        });
                    }
                }
            }

            if (ponente_id != null) {
                if (usuario.rol !== 'Ponente' && usuario.rol !== 'ponente') {
                    return res.status(403).json({
                        success: false,
                        message: 'Acceso denegado. Solo ponentes pueden acceder a encuestas por ponente_id.'
                    });
                }

                const ponente = await Ponente.findOne({
                    where: { id_usuario: usuario.id }
                });

                if (ponente_id != ponente.id_ponente) {
                    return res.status(403).json({
                        success: false,
                        message: 'Acceso denegado. No puedes acceder a encuestas de otro ponente.'
                    });
                }

                const actividadesAsignadas = await PonenteActividad.findAll({
                    where: { id_ponente: ponente.id_ponente, estado: 'aceptado' },
                    attributes: ['id_actividad']
                });

                const actividadesIds = actividadesAsignadas.map(pa => pa.id_actividad);

                console.log('Actividades asignadas al ponente:', actividadesIds);
                const contieneActividadId = actividad_id ? actividadesIds.includes(parseInt(actividad_id)) : true;
                console.log('¿Contiene actividad_id solicitada?', contieneActividadId);
                let encuestas;

                if (evento_id) {
                    encuestas = await EncuestaService.obtenerPorPonenteEvento(actividadesIds, evento_id);
                } else if (actividad_id) {
                    if (actividadesIds.includes(parseInt(actividad_id))) {
                        encuestas = await EncuestaService.obtenerPorPonenteActividad(actividad_id);
                    } else {
                        return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                            success: false,
                            message: 'Acceso denegado. La actividad no está asignada al ponente.'
                        });
                    }
                }
                else {
                    encuestas = await EncuestaService.obtenerPorPonente(actividadesIds);
                }

                return res.json({
                    success: true,
                    message: MENSAJES.LISTA_OBTENIDA,
                    total: encuestas.length,
                    data: encuestas
                });

            }

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
    
            const envios = await EncuestaService. enviarEncuestasMasivas(
                encuestaId,
                transaction
            );
    
            await transaction.commit();
    
            // Enviar emails EN PARALELO (mucho más rápido)
            let emailsEnviados = 0;
            let emailsFallidos = 0;
            const erroresEmail = [];
    
            if (envios.length > 0) {
                const resultadosEmail = await Promise.allSettled(
                    envios. map(envio => 
                        EmailService.enviarEncuesta(
                            envio. asistente.correo,
                            envio.asistente.nombre,
                            envio. url
                        )
                    )
                );
    
                resultadosEmail.forEach((resultado, index) => {
                    if (resultado.status === 'fulfilled') {
                        emailsEnviados++;
                    } else {
                        emailsFallidos++;
                        erroresEmail.push({
                            asistente: envios[index].asistente.correo,
                            error: resultado.reason?. message || 'Error desconocido'
                        });
                        console.error(`Error enviando email a ${envios[index].asistente. correo}:`, resultado.reason);
                    }
                });
            }
    
            return res.json({
                success: true,
                message: MENSAJES. ENVIADA,
                data: {
                    total_registrados: envios.length,
                    emails_enviados: emailsEnviados,
                    emails_fallidos: emailsFallidos,
                    asistentes: envios.map(e => e.asistente),
                    errores: emailsFallidos > 0 ? erroresEmail : undefined
                }
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al enviar encuesta:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_ENVIAR,
                error: error. message
            });
        }
    }

    async completarEncuesta(req, res) {
        try {
            const { id_encuesta, id_asistente } = req.body;

            if (!id_encuesta || !id_asistente) {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: 'id_encuesta y id_asistente son requeridos'
                });
            }

            const respuesta = await EncuestaService.marcarComoCompletada(id_encuesta, id_asistente);

            return res.json({
                success: true,
                message: MENSAJES.COMPLETADA,
                data: respuesta
            });
        } catch (error) {
            console.error('Error al completar encuesta:', error);

            if (error.message === 'No registrado en esta encuesta') {
                return res.status(CODIGOS_HTTP.NOT_FOUND).json({
                    success: false,
                    message: MENSAJES.TOKEN_INVALIDO
                });
            }

            if (error.message === 'Encuesta ya completada') {
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

    async obtenerRespuestasEncuestaAsistentes(req, res) {
        try {
            const { encuesta_id} = req.query;
            const usuario = req.usuario;
            let asistente = null;
            if (usuario.rol === 'Asistente' || usuario.rol === 'asistente') {
                asistente = await Asistente.findOne({
                    where: { id_usuario: usuario.id }
                });
            } 
            if (!asistente) {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado. Solo asistentes pueden acceder a sus respuestas de encuestas.'
                });
            }

            if (encuesta_id) {
                const encuesta = await EncuestaService.buscarPorId(encuesta_id);
                if (!encuesta) {
                    return res.status(404).json({
                        success: false, 
                        message: 'Encuesta no encontrada.'
                    });
                }
            }

            const respuestas = await EncuestaService.obtenerRespuestasEncuestaAsistentes(asistente.id_asistente);
            const respuestaPorEncuesta = respuestas.filter(r => r.id_encuesta == encuesta_id);

            if (encuesta_id){
                return res.json({
                    success: true,
                    message: MENSAJES.LISTA_OBTENIDA,
                    data: respuestaPorEncuesta[0] || null
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.LISTA_OBTENIDA,
                total: respuestas.length,
                data: respuestas
            });

        } catch (error) {
            console.error('Error al obtener respuestas de encuesta:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }
}

module.exports = new EncuestaController();
