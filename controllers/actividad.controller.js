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

            const errorSolapamiento = await ActividadValidator.validarSolapamiento(
                null, 
                eventoId,
                datosActividad.fecha_actividad,
                datosActividad.hora_inicio,
                datosActividad.hora_fin,
                datosActividad.lugares || [],
                datosActividad.ponentes || []
            );

            if (errorSolapamiento) {
                await transaction.rollback();
                return res.status(CODIGOS_HTTP.CONFLICT).json({
                    success: false,
                    message: errorSolapamiento
                });
            }

            const actividad = await ActividadService.crear(
                eventoId,
                datosActividad,
                evento,
                transaction
            );

            await AuditoriaService.registrarAccion(
                usuario.id,
                'CREAR',
                'actividad',
                actividad.id_actividad,
                datosActividad
            );

            await transaction.commit();

            return res.status(CODIGOS_HTTP.CREATED).json({
                success: true,
                message: MENSAJES_RESPUESTA.ACTIVIDAD_CREADA,
                data: actividad
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Error al crear actividad:', error);
            return res.status(CODIGOS_HTTP.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_CREAR
            });
        }
    }

    async obtenerActividadesPorEvento(req, res) {
        try {
            const { eventoId } = req.params;
            const actividades = await ActividadService.buscarTodasPorEvento(eventoId);

            return res.status(CODIGOS_HTTP.OK).json({
                success: true,
                data: actividades
            });

        } catch (error) {
            console.error('Error al obtener actividades:', error);
            return res.status(CODIGOS_HTTP.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_OBTENER
            });
        }
    }

    async obtenerActividadPorId(req, res) {
        try {
            const actividad = req.actividad;

            return res.status(CODIGOS_HTTP.OK).json({
                success: true,
                data: actividad
            });

        } catch (error) {
            console.error('Error al obtener actividad:', error);
            return res.status(CODIGOS_HTTP.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_OBTENER
            });
        }
    }

    async actualizarActividad(req, res) {
        const transaction = await ActividadService.crearTransaccion();
        try {
            const { eventoId, actividadId } = req.params;
            const datosActualizacion = req.body;
            const evento = req.evento;
            const actividad = req.actividad;

            const errorValidacion = ActividadValidator.validarActualizacion(
                datosActualizacion,
                actividad,
                evento
            );

            if (errorValidacion) {
                await transaction.rollback();
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: errorValidacion
                });
            }

            const errorSolapamiento = await ActividadValidator.validarSolapamiento(
                actividadId, 
                eventoId,
                datosActualizacion.fecha_actividad || actividad.fecha_actividad,
                datosActualizacion.hora_inicio || actividad.hora_inicio,
                datosActualizacion.hora_fin || actividad.hora_fin,
                datosActualizacion.lugares || [],
                datosActualizacion.ponentes || []
            );

            if (errorSolapamiento) {
                await transaction.rollback();
                return res.status(CODIGOS_HTTP.CONFLICT).json({
                    success: false,
                    message: errorSolapamiento
                });
            }

            const actividadActualizada = await ActividadService.actualizar(
                actividadId,
                datosActualizacion,
                evento,
                transaction
            );

            await AuditoriaService.registrarAccion(
                req.usuario.id,
                'ACTUALIZAR',
                'actividad',
                actividadId,
                datosActualizacion
            );

            await transaction.commit();

            return res.status(CODIGOS_HTTP.OK).json({
                success: true,
                message: MENSAJES_RESPUESTA.ACTIVIDAD_ACTUALIZADA,
                data: actividadActualizada
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar actividad:', error);
            return res.status(CODIGOS_HTTP.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_ACTUALIZAR
            });
        }
    }

    async eliminarActividad(req, res) {
        const transaction = await ActividadService.crearTransaccion();
        try {
            const { actividadId } = req.params;
            const actividad = req.actividad;

            await ActividadService.eliminar(actividadId, transaction);

            await AuditoriaService.registrarAccion(
                req.usuario.id,
                'ELIMINAR',
                'actividad',
                actividadId,
                null
            );

            await transaction.commit();

            return res.status(CODIGOS_HTTP.OK).json({
                success: true,
                message: MENSAJES_RESPUESTA.ACTIVIDAD_ELIMINADA
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Error al eliminar actividad:', error);
            return res.status(CODIGOS_HTTP.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MENSAJES_RESPUESTA.ERROR_ELIMINAR
            });
        }
    }
}

module.exports = new ActividadController();
