const { PonenteActividad, Ponente, Actividad, Usuario, Evento } = require('../models');
const { MENSAJES } = require('../constants/ponenteActividad.constants');
const NotificacionService = require('./notificacion.service');

class PonenteActividadService {
    crearTransaccion() {
        return PonenteActividad.sequelize.transaction();
    }

    async asignar(datosAsignacion, transaction) {
        const asignacion = await PonenteActividad.create(datosAsignacion, { transaction });

        // Obtener datos completos para la respuesta
        const asignacionCompleta = await this.buscarPorIds(
            datosAsignacion.id_ponente,
            datosAsignacion.id_actividad,
            transaction
        );

        return asignacionCompleta;
    }

    async obtenerPorActividad(actividadId) {
        const actividad = await Actividad.findByPk(actividadId);
        if (!actividad) {
            return {
                exito: false,
                mensaje: MENSAJES.ACTIVIDAD_NO_ENCONTRADA
            };
        }

        const asignaciones = await PonenteActividad.findAll({
            where: { id_actividad: actividadId },
            include: [
                {
                    model: Ponente,
                    as: 'ponente',
                    include: [{
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id', 'nombre', 'apellido', 'email']
                    }]
                }
            ],
            order: [['fecha_asignacion', 'DESC']]
        });

        return {
            exito: true,
            asignaciones
        };
    }

    async obtenerPorPonente(ponenteId) {
        const ponente = await Ponente.findByPk(ponenteId);
        if (!ponente) {
            return {
                exito: false,
                mensaje: MENSAJES.PONENTE_NO_ENCONTRADO
            };
        }

        const asignaciones = await PonenteActividad.findAll({
            where: { id_ponente: ponenteId },
            include: [
                {
                    model: Actividad,
                    as: 'actividad',
                    include: [{
                        model: Evento,
                        as: 'evento',
                        attributes: ['id', 'nombre', 'fecha_inicio', 'fecha_fin']
                    }]
                }
            ],
            order: [[{ model: Actividad, as: 'actividad' }, 'fecha_actividad', 'ASC']]
        });

        return {
            exito: true,
            asignaciones
        };
    }

    async buscarPorIds(ponenteId, actividadId, transaction = null) {
        return await PonenteActividad.findOne({
            where: {
                id_ponente: ponenteId,
                id_actividad: actividadId
            },
            include: [
                {
                    model: Ponente,
                    as: 'ponente',
                    include: [{
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id', 'nombre', 'apellido', 'email']
                    }]
                },
                {
                    model: Actividad,
                    as: 'actividad',
                    include: [{
                        model: Evento,
                        as: 'evento',
                        attributes: ['id', 'nombre']
                    }]
                }
            ],
            ...(transaction && { transaction })
        });
    }

    async solicitarCambio({ id_ponente, id_actividad, cambios_solicitados, justificacion, id_usuario_ponente }, transaction) {
        const asignacion = await this.buscarPorIds(id_ponente, id_actividad, transaction);

        if (!asignacion) {
            throw new Error(MENSAJES.NO_ENCONTRADO);
        }

        // Actualizar estado de la asignación
        await asignacion.update({
            estado: 'solicitud_cambio',
            notas: justificacion
        }, { transaction });

        // Crear notificación para los administradores
        await NotificacionService.crearNotificacionSolicitudCambio({
            asignacion,
            cambios_solicitados,
            justificacion,
            id_solicitante: id_usuario_ponente
        }, transaction);

        return asignacion;
    }

    async procesarSolicitud({ id_ponente, id_actividad, aprobada, comentarios, id_usuario_admin }, transaction) {
        const asignacion = await this.buscarPorIds(id_ponente, id_actividad, transaction);

        if (!asignacion) {
            throw new Error(MENSAJES.NO_ENCONTRADO);
        }

        const nuevoEstado = aprobada ? 'aceptado' : 'rechazado';

        await asignacion.update({
            estado: nuevoEstado,
            fecha_respuesta: new Date(),
            notas: comentarios || asignacion.notas
        }, { transaction });

        // Crear notificación para el ponente
        await NotificacionService.crearNotificacionRespuestaSolicitud({
            asignacion,
            aprobada,
            comentarios,
            id_respondedor: id_usuario_admin
        }, transaction);

        return asignacion;
    }

    construirActualizaciones({ estado, notas }) {
        const actualizaciones = {};
        if (estado !== undefined) actualizaciones.estado = estado;
        if (notas !== undefined) actualizaciones.notas = notas;
        if (Object.keys(actualizaciones).length > 0) {
            actualizaciones.fecha_respuesta = new Date();
        }
        return actualizaciones;
    }
}

module.exports = new PonenteActividadService();
