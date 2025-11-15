const PonenteActividadService = require('../services/ponenteActividad.service');
const PonenteActividadValidator = require('../validators/ponenteActividad.validator');
const PermisosService = require('../services/permisos.service');
const AuditoriaService = require('../services/auditoriaService');
const { MENSAJES } = require('../constants/ponenteActividad.constants');

class PonenteActividadController {
    async asignarPonente(req, res) {
        const transaction = await PonenteActividadService.crearTransaccion();
        try {
            const { id_ponente, id_actividad, estado, notas } = req.body;
            const usuario = req.usuario;

            if (!['admin', 'organizador'].includes(usuario.rol)) {
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: MENSAJES.SIN_PERMISO_CREAR
                });
            }

            const validacion = await PonenteActividadValidator.validarAsignacion({
                id_ponente,
                id_actividad
            });

            if (!validacion.esValida) {
                await transaction.rollback();
                return res.status(validacion.codigoEstado || 400).json({
                    success: false,
                    message: validacion.mensaje
                });
            }

            const asignacion = await PonenteActividadService.asignar({
                id_ponente,
                id_actividad,
                estado: estado || 'aceptado',
                notas,
                fecha_asignacion: new Date()
            }, transaction);

            await AuditoriaService.registrar({
                mensaje: `Ponente ${validacion.ponente.especialidad} asignado a actividad ${validacion.actividad.titulo}`,
                tipo: 'POST',
                accion: 'asignar_ponente',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.status(201).json({
                success: true,
                message: MENSAJES.ASIGNADO,
                data: asignacion
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al asignar ponente:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_CREAR,
                error: error.message
            });
        }
    }

    async obtenerPorActividad(req, res) {
        try {
            const { actividadId } = req.params;
            const usuario = req.usuario;

            const resultado = await PonenteActividadService.obtenerPorActividad(actividadId);

            if (!resultado.exito) {
                return res.status(404).json({
                    success: false,
                    message: resultado.mensaje
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.LISTA_OBTENIDA,
                total: resultado.asignaciones.length,
                data: resultado.asignaciones
            });
        } catch (error) {
            console.error('Error al obtener ponentes de actividad:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async obtenerPorPonente(req, res) {
        try {
            const { ponenteId } = req.params;
            const usuario = req.usuario;

            const resultado = await PonenteActividadService.obtenerPorPonente(ponenteId);

            if (!resultado.exito) {
                return res.status(404).json({
                    success: false,
                    message: resultado.mensaje
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.LISTA_OBTENIDA,
                total: resultado.asignaciones.length,
                data: resultado.asignaciones
            });
        } catch (error) {
            console.error('Error al obtener actividades del ponente:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async obtenerAsignacion(req, res) {
        try {
            const { ponenteId, actividadId } = req.params;
            const usuario = req.usuario;

            const asignacion = await PonenteActividadService.buscarPorIds(ponenteId, actividadId);

            if (!asignacion) {
                return res.status(404).json({
                    success: false,
                    message: MENSAJES.NO_ENCONTRADO
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.OBTENIDO,
                data: asignacion
            });
        } catch (error) {
            console.error('Error al obtener asignación:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async solicitarCambio(req, res) {
        const transaction = await PonenteActividadService.crearTransaccion();
        try {
            const { ponenteId, actividadId } = req.params;
            const { cambios_solicitados, justificacion } = req.body;
            const usuario = req.usuario;

            // Validar que el usuario sea el ponente de esta actividad
            const asignacion = await PonenteActividadService.buscarPorIds(ponenteId, actividadId, transaction);

            if (!asignacion) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: MENSAJES.NO_ENCONTRADO
                });
            }

            if (asignacion.ponente.id_usuario !== usuario.id && !['admin', 'organizador'].includes(usuario.rol)) {
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: MENSAJES.SIN_PERMISO_MODIFICAR
                });
            }

            const validacion = PonenteActividadValidator.validarSolicitudCambio({
                cambios_solicitados,
                justificacion
            });

            if (!validacion.esValida) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: validacion.mensaje
                });
            }

            const asignacionActualizada = await PonenteActividadService.solicitarCambio({
                id_ponente: ponenteId,
                id_actividad: actividadId,
                cambios_solicitados,
                justificacion,
                id_usuario_ponente: usuario.id
            }, transaction);

            await AuditoriaService.registrar({
                mensaje: `Solicitud de cambio enviada para actividad ${asignacion.actividad.titulo}`,
                tipo: 'POST',
                accion: 'solicitar_cambio_actividad',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.SOLICITUD_ENVIADA,
                data: asignacionActualizada
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al solicitar cambio:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_SOLICITUD,
                error: error.message
            });
        }
    }

    async procesarSolicitud(req, res) {
        const transaction = await PonenteActividadService.crearTransaccion();
        try {
            const { ponenteId, actividadId } = req.params;
            const { aprobada, comentarios } = req.body;
            const usuario = req.usuario;

            // Solo admin/organizador puede procesar solicitudes
            if (!['admin', 'organizador'].includes(usuario.rol)) {
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: MENSAJES.SIN_PERMISO_MODIFICAR
                });
            }

            const asignacion = await PonenteActividadService.procesarSolicitud({
                id_ponente: ponenteId,
                id_actividad: actividadId,
                aprobada,
                comentarios,
                id_usuario_admin: usuario.id
            }, transaction);

            await AuditoriaService.registrar({
                mensaje: `Solicitud de cambio ${aprobada ? 'aprobada' : 'rechazada'} para actividad`,
                tipo: 'PUT',
                accion: 'procesar_solicitud_cambio',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.SOLICITUD_PROCESADA,
                data: asignacion
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al procesar solicitud:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_SOLICITUD,
                error: error.message
            });
        }
    }

    async actualizarAsignacion(req, res) {
        const transaction = await PonenteActividadService.crearTransaccion();
        try {
            const { ponenteId, actividadId } = req.params;
            const { estado, notas } = req.body;
            const usuario = req.usuario;

            // Solo admin/organizador
            if (!['admin', 'organizador'].includes(usuario.rol)) {
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: MENSAJES.SIN_PERMISO_MODIFICAR
                });
            }

            const asignacion = await PonenteActividadService.buscarPorIds(ponenteId, actividadId, transaction);

            if (!asignacion) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: MENSAJES.NO_ENCONTRADO
                });
            }

            if (estado) {
                const validacionEstado = PonenteActividadValidator.validarEstado(estado);
                if (!validacionEstado.esValida) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: validacionEstado.mensaje
                    });
                }
            }

            const actualizaciones = PonenteActividadService.construirActualizaciones({ estado, notas });
            await asignacion.update(actualizaciones, { transaction });

            await AuditoriaService.registrar({
                mensaje: `Asignación actualizada para ponente-actividad`,
                tipo: 'PUT',
                accion: 'actualizar_ponente_actividad',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.ACTUALIZADO,
                data: asignacion
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar asignación:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_ACTUALIZAR,
                error: error.message
            });
        }
    }

    async eliminarAsignacion(req, res) {
        const transaction = await PonenteActividadService.crearTransaccion();
        try {
            const { ponenteId, actividadId } = req.params;
            const usuario = req.usuario;

            // Solo admin/organizador
            if (!['admin', 'organizador'].includes(usuario.rol)) {
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: MENSAJES.SIN_PERMISO_ELIMINAR
                });
            }

            const asignacion = await PonenteActividadService.buscarPorIds(ponenteId, actividadId, transaction);

            if (!asignacion) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: MENSAJES.NO_ENCONTRADO
                });
            }

            await asignacion.destroy({ transaction });

            await AuditoriaService.registrar({
                mensaje: `Ponente removido de actividad`,
                tipo: 'DELETE',
                accion: 'eliminar_ponente_actividad',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.ELIMINADO
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al eliminar asignación:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_ELIMINAR,
                error: error.message
            });
        }
    }
}

module.exports = new PonenteActividadController();
