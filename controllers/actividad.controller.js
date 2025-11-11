const ActividadService = require('../services/actividad.service');
const ActividadValidator = require('../validators/actividad.validator');
const PermisosService = require('../services/permisos.service');
const AuditoriaService = require('../services/auditoriaService');
const { CODIGOS_HTTP, MENSAJES_RESPUESTA } = require('../constants/actividad.constants');

class ActividadController {
    async crearActividad(req, res) {
        const transaction = await ActividadService.crearTransaccion();

        try {
            const { eventoId } = req.params;
            const datosActividad = req.body;
            const evento = req.evento;
            const usuario = req.usuario;

            const errorValidacion = ActividadValidator.validarCreacion(datosActividad, evento);
            if (errorValidacion) {
                await transaction.rollback();
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: errorValidacion
                });
            }

            const actividad = await ActividadService.crear(
                eventoId,
                datosActividad,
                evento,
                transaction
            );

            await AuditoriaService.log({
                message: `Se creó la actividad: ${datosActividad.titulo} para evento ${evento.titulo}`,
                type: 'POST',
                action: 'crear_actividad',
                user: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.status(CODIGOS_HTTP.CREADO).json({
                success: true,
                message: MENSAJES_RESPUESTA.ACTIVIDAD_CREADA,
                data: actividad
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al crear actividad:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_CREAR,
                error: error.message
            });
        }
    }

    async obtenerActividadesEvento(req, res) {
        try {
            const { eventoId } = req.params;

            const evento = await ActividadService.buscarEventoPorId(eventoId);
            if (!evento) {
                return res.status(CODIGOS_HTTP.NOT_FOUND).json({
                    success: false,
                    message: MENSAJES_RESPUESTA.EVENTO_NO_ENCONTRADO
                });
            }

            const actividades = await ActividadService.buscarTodasPorEvento(eventoId);

            return res.json({
                success: true,
                message: MENSAJES_RESPUESTA.ACTIVIDADES_OBTENIDAS,
                total: actividades.length,
                data: actividades
            });
        } catch (error) {
            console.error('Error al obtener actividades:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async obtenerActividadById(req, res) {
        try {
            const { actividadId } = req.params;
            const usuario = req.usuario;

            const resultadoPermiso = await PermisosService.verificarPermisoLectura(usuario, actividadId);

            if (!resultadoPermiso.tienePermiso) {
                return res.status(resultadoPermiso.codigoEstado).json({
                    success: false,
                    message: resultadoPermiso.mensaje
                });
            }

            return res.json({
                success: true,
                message: MENSAJES_RESPUESTA.ACTIVIDAD_OBTENIDA,
                data: resultadoPermiso.actividad
            });
        } catch (error) {
            console.error('Error al obtener actividad:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async actualizarActividad(req, res) {
        const transaction = await ActividadService.crearTransaccion();

        try {
            const { actividadId } = req.params;
            const datosActualizacion = req.body;
            const usuario = req.usuario;

            const resultadoPermiso = await PermisosService.verificarPermisoEscritura(usuario, actividadId);

            if (!resultadoPermiso.tienePermiso) {
                await transaction.rollback();
                return res.status(resultadoPermiso.codigoEstado).json({
                    success: false,
                    message: resultadoPermiso.mensaje
                });
            }

            const { actividad, evento } = resultadoPermiso;

            const errorValidacion = ActividadValidator.validarActualizacion(datosActualizacion, actividad, evento);
            if (errorValidacion) {
                await transaction.rollback();
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: errorValidacion
                });
            }

            const actividadActualizada = await ActividadService.actualizar(
                actividadId,
                datosActualizacion,
                evento,
                transaction
            );

            await AuditoriaService.log({
                message: `Se actualizó la actividad: ${actividad.titulo}`,
                type: 'PUT',
                action: 'actualizar_actividad',
                user: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES_RESPUESTA.ACTIVIDAD_ACTUALIZADA,
                data: actividadActualizada
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar actividad:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_ACTUALIZAR,
                error: error.message
            });
        }
    }

    async eliminarActividad(req, res) {
        const transaction = await ActividadService.crearTransaccion();

        try {
            const { actividadId } = req.params;
            const usuario = req.usuario;

            const resultadoPermiso = await PermisosService.verificarPermisoEscritura(usuario, actividadId);

            if (!resultadoPermiso.tienePermiso) {
                await transaction.rollback();
                return res.status(resultadoPermiso.codigoEstado).json({
                    success: false,
                    message: resultadoPermiso.mensaje
                });
            }

            const { actividad } = resultadoPermiso;

            await ActividadService.eliminar(actividadId, transaction);

            await AuditoriaService.log({
                message: `Se eliminó la actividad: ${actividad.titulo}`,
                type: 'DELETE',
                action: 'eliminar_actividad',
                user: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES_RESPUESTA.ACTIVIDAD_ELIMINADA
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al eliminar actividad:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_ELIMINAR,
                error: error.message
            });
        }
    }
}

module.exports = new ActividadController();
