const { Notificacion, TipoNotificacion, Usuario, Evento, Rol } = require('../models');
const { MENSAJES, TIPOS_ENTIDAD, ESTADOS_NOTIFICACION } = require('../constants/notificacion.constants');

class NotificacionService {
    crearTransaccion() {
        return Notificacion.sequelize.transaction();
    }

    async crear(datosNotificacion, transaction) {
        const notificacion = await Notificacion.create(datosNotificacion, { transaction });
        return notificacion;
    }

    async obtenerResponsablesEvento(eventoId) {
        const evento = await Evento.findByPk(eventoId, {
            include: [
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['id', 'nombre', 'apellido', 'rol']
                }
            ]
        });

        if (!evento) {
            return [];
        }

        const responsables = [];

        if (evento.creador) {
            responsables.push(evento.creador);
        }

        if (evento.id_empresa) {
            const gerentes = await Usuario.findAll({
                include: [{
                    model: Rol,
                    as: 'rolData',
                    where: {
                        nombre: 'gerente',
                        id_empresa: evento.id_empresa
                    }
                }],
                attributes: ['id', 'nombre', 'apellido', 'rol']
            });
            responsables.push(...gerentes);
        }

        const responsablesUnicos = responsables.reduce((acc, usuario) => {
            if (!acc.find(u => u.id === usuario.id)) {
                acc.push(usuario);
            }
            return acc;
        }, []);

        if (responsablesUnicos.length === 0) {
            const admins = await Usuario.findAll({
                where: { rol: 'admin' },
                attributes: ['id', 'nombre', 'apellido', 'rol'],
                limit: 3
            });
            return admins;
        }

        return responsablesUnicos;
    }

    async crearNotificacionAsignacionPonente({ ponente, actividad, evento }, transaction) {
        const tipoNotificacion = await TipoNotificacion.findOne({
            where: { nombre: 'asignacion_ponente' }
        });

        const notificaciones = [];

        const notificacionPonente = await this.crear({
            id_TipoNotificacion: tipoNotificacion?.id || 1,
            titulo: 'Invitación a actividad',
            contenido: `Has sido invitado como ponente en la actividad "${actividad.titulo}" del evento "${evento.nombre}".`,
            entidad_tipo: TIPOS_ENTIDAD.PONENTE_ACTIVIDAD,
            entidad_id: ponente.id_ponente,
            id_destinatario: ponente.id_usuario,
            id_evento: evento.id,
            datos_adicionales: {
                id_ponente: ponente.id_ponente,
                id_actividad: actividad.id_actividad,
                nombre_evento: evento.nombre,
                nombre_actividad: actividad.titulo,
                fecha_actividad: actividad.fecha_actividad
            },
            estado: ESTADOS_NOTIFICACION.PENDIENTE,
            prioridad: 'alta'
        }, transaction);

        notificaciones.push(notificacionPonente);

        const responsables = await this.obtenerResponsablesEvento(evento.id);

        for (const responsable of responsables) {
            const notif = await this.crear({
                id_TipoNotificacion: tipoNotificacion?.id || 1,
                titulo: 'Nuevo ponente invitado',
                contenido: `Se invitó a ${ponente.usuario?.nombre || 'un ponente'} ${ponente.usuario?.apellido || ''} a la actividad "${actividad.titulo}" del evento "${evento.nombre}".`,
                entidad_tipo: TIPOS_ENTIDAD.PONENTE_ACTIVIDAD,
                entidad_id: ponente.id_ponente,
                id_destinatario: responsable.id,
                id_evento: evento.id,
                datos_adicionales: {
                    id_ponente: ponente.id_ponente,
                    id_actividad: actividad.id_actividad,
                    nombre_evento: evento.nombre,
                    nombre_actividad: actividad.titulo
                },
                estado: ESTADOS_NOTIFICACION.PENDIENTE,
                prioridad: 'baja'
            }, transaction);

            notificaciones.push(notif);
        }

        return notificaciones;
    }

    async crearNotificacionRespuestaInvitacion({ asignacion, aceptada, motivo_rechazo, id_ponente_usuario }, transaction) {
        const tipoNotificacion = await TipoNotificacion.findOne({
            where: { nombre: aceptada ? 'invitacion_aceptada' : 'invitacion_rechazada' }
        });

        const responsables = await this.obtenerResponsablesEvento(asignacion.actividad.id_evento);

        const notificaciones = [];

        const titulo = aceptada
            ? 'Ponente aceptó invitación'
            : 'Ponente rechazó invitación';

        const contenido = aceptada
            ? `${asignacion.ponente.usuario.nombre} ${asignacion.ponente.usuario.apellido} ha aceptado la invitación para la actividad "${asignacion.actividad.titulo}" del evento "${asignacion.actividad.evento.nombre}".`
            : `${asignacion.ponente.usuario.nombre} ${asignacion.ponente.usuario.apellido} ha rechazado la invitación para la actividad "${asignacion.actividad.titulo}". ${motivo_rechazo ? `Motivo: ${motivo_rechazo}` : ''}`;

        for (const responsable of responsables) {
            const notif = await this.crear({
                id_TipoNotificacion: tipoNotificacion?.id || 1,
                titulo,
                contenido,
                entidad_tipo: TIPOS_ENTIDAD.PONENTE_ACTIVIDAD,
                entidad_id: asignacion.id_ponente,
                id_destinatario: responsable.id,
                id_evento: asignacion.actividad.id_evento,
                datos_adicionales: {
                    id_ponente: asignacion.id_ponente,
                    id_actividad: asignacion.id_actividad,
                    aceptada,
                    motivo_rechazo,
                    id_ponente_usuario,
                    nombre_evento: asignacion.actividad.evento.nombre,
                    nombre_actividad: asignacion.actividad.titulo
                },
                estado: ESTADOS_NOTIFICACION.PENDIENTE,
                prioridad: aceptada ? 'media' : 'alta'
            }, transaction);

            notificaciones.push(notif);
        }

        return notificaciones;
    }

    async crearNotificacionSolicitudCambio({ asignacion, cambios_solicitados, justificacion, id_solicitante }, transaction) {
        const tipoNotificacion = await TipoNotificacion.findOne({
            where: { nombre: 'solicitud_cambio_actividad' }
        });

        const responsables = await this.obtenerResponsablesEvento(asignacion.actividad.id_evento);

        const notificaciones = [];

        for (const responsable of responsables) {
            const notificacion = await this.crear({
                id_TipoNotificacion: tipoNotificacion?.id || 1,
                titulo: 'Solicitud de cambio en actividad',
                contenido: `El ponente ${asignacion.ponente.usuario.nombre} ${asignacion.ponente.usuario.apellido} solicita cambios en la actividad "${asignacion.actividad.titulo}" del evento "${asignacion.actividad.evento.nombre}". Justificación: ${justificacion}`,
                entidad_tipo: TIPOS_ENTIDAD.PONENTE_ACTIVIDAD,
                entidad_id: asignacion.id_ponente,
                id_destinatario: responsable.id,
                id_evento: asignacion.actividad.id_evento,
                datos_adicionales: {
                    cambios_solicitados,
                    justificacion,
                    id_ponente: asignacion.id_ponente,
                    id_actividad: asignacion.id_actividad,
                    id_solicitante,
                    nombre_evento: asignacion.actividad.evento.nombre,
                    nombre_actividad: asignacion.actividad.titulo
                },
                estado: ESTADOS_NOTIFICACION.PENDIENTE,
                prioridad: 'alta'
            }, transaction);

            notificaciones.push(notificacion);
        }

        return notificaciones;
    }

    async crearNotificacionRespuestaSolicitud({ asignacion, aprobada, comentarios, id_respondedor }, transaction) {
        const tipoNotificacion = await TipoNotificacion.findOne({
            where: { nombre: aprobada ? 'cambio_aprobado' : 'cambio_rechazado' }
        });

        const titulo = aprobada
            ? 'Solicitud de cambio aprobada'
            : 'Solicitud de cambio rechazada';

        const contenido = aprobada
            ? `Tu solicitud de cambio para la actividad "${asignacion.actividad.titulo}" del evento "${asignacion.actividad.evento.nombre}" ha sido aprobada. ${comentarios || ''}`
            : `Tu solicitud de cambio para la actividad "${asignacion.actividad.titulo}" del evento "${asignacion.actividad.evento.nombre}" ha sido rechazada. ${comentarios || ''}`;

        const notificacion = await this.crear({
            id_TipoNotificacion: tipoNotificacion?.id || 1,
            titulo,
            contenido,
            entidad_tipo: TIPOS_ENTIDAD.PONENTE_ACTIVIDAD,
            entidad_id: asignacion.id_ponente,
            id_destinatario: asignacion.ponente.id_usuario,
            id_evento: asignacion.actividad.id_evento,
            datos_adicionales: {
                id_ponente: asignacion.id_ponente,
                id_actividad: asignacion.id_actividad,
                aprobada,
                comentarios,
                id_respondedor,
                nombre_evento: asignacion.actividad.evento.nombre,
                nombre_actividad: asignacion.actividad.titulo
            },
            estado: ESTADOS_NOTIFICACION.PENDIENTE,
            prioridad: 'alta'
        }, transaction);

        return notificacion;
    }

    async obtenerPorUsuario(usuarioId, filtros = {}) {
        const whereClause = { id_destinatario: usuarioId };

        if (filtros.estado) {
            whereClause.estado = filtros.estado;
        }

        if (filtros.entidad_tipo) {
            whereClause.entidad_tipo = filtros.entidad_tipo;
        }

        const notificaciones = await Notificacion.findAll({
            where: whereClause,
            include: [{
                model: TipoNotificacion,
                as: 'tipoNotificacion',
                attributes: ['id', 'nombre', 'descripcion']
            }],
            order: [['fecha_creacion', 'DESC']],
            limit: filtros.limit || 50
        });

        return {
            exito: true,
            notificaciones
        };
    }

    async marcarComoLeida(notificacionId, usuarioId, transaction = null) {
        const notificacion = await Notificacion.findByPk(notificacionId, { transaction });

        if (!notificacion) {
            return {
                exito: false,
                mensaje: MENSAJES.NO_ENCONTRADA
            };
        }

        if (notificacion.id_destinatario !== usuarioId) {
            return {
                exito: false,
                mensaje: MENSAJES.SIN_PERMISO_MODIFICAR
            };
        }

        await notificacion.update({
            estado: ESTADOS_NOTIFICACION.LEIDA,
            fecha_leida: new Date()
        }, { transaction });

        return {
            exito: true,
            notificacion
        };
    }

    async buscarPorId(notificacionId, transaction = null) {
        return await Notificacion.findByPk(notificacionId, {
            include: [{
                model: TipoNotificacion,
                as: 'tipoNotificacion',
                attributes: ['id', 'nombre', 'descripcion']
            }],
            ...(transaction && { transaction })
        });
    }
}

module.exports = new NotificacionService();
