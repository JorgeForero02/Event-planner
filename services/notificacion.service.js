const { Notificacion, TipoNotificacion, Usuario, Evento, Actividad, Rol } = require('../models');
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
                    as: 'organizador', // Usuario que creó el evento
                    attributes: ['id', 'nombre', 'apellido', 'rol']
                },
                {
                    model: Usuario,
                    as: 'usuariosRelacionados', // Otros usuarios con acceso
                    attributes: ['id', 'nombre', 'apellido', 'rol'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!evento) {
            return [];
        }

        const responsables = [];

        if (evento.organizador) {
            responsables.push(evento.organizador);
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

        if (evento.usuariosRelacionados) {
            const organizadores = evento.usuariosRelacionados.filter(
                u => u.rol === 'organizador' || u.rol === 'gerente'
            );
            responsables.push(...organizadores);
        }

        const responsablesUnicos = responsables.reduce((acc, usuario) => {
            if (!acc.find(u => u.id === usuario.id)) {
                acc.push(usuario);
            }
            return acc;
        }, []);

        return responsablesUnicos;
    }

    async crearNotificacionSolicitudCambio({ asignacion, cambios_solicitados, justificacion, id_solicitante }, transaction) {
        const tipoNotificacion = await TipoNotificacion.findOne({
            where: { nombre: 'solicitud_cambio_actividad' }
        });

        const responsables = await this.obtenerResponsablesEvento(asignacion.actividad.id_evento);

        if (responsables.length === 0) {
            console.warn(`No se encontraron responsables para el evento ${asignacion.actividad.id_evento}`);
            const admins = await Usuario.findAll({
                where: { rol: 'admin' },
                attributes: ['id']
            });
            responsables.push(...admins);
        }

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

    async crearNotificacionAsignacionPonente({ ponente, actividad, evento }, transaction) {
        const tipoNotificacion = await TipoNotificacion.findOne({
            where: { nombre: 'asignacion_ponente' }
        });

        const notificacionPonente = await this.crear({
            id_TipoNotificacion: tipoNotificacion?.id || 1,
            titulo: 'Asignación a actividad',
            contenido: `Has sido asignado como ponente en la actividad "${actividad.titulo}" del evento "${evento.nombre}".`,
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
            prioridad: 'media'
        }, transaction);

        const responsables = await this.obtenerResponsablesEvento(evento.id);
        const notificacionesResponsables = [];

        for (const responsable of responsables) {
            const notif = await this.crear({
                id_TipoNotificacion: tipoNotificacion?.id || 1,
                titulo: 'Nuevo ponente asignado',
                contenido: `Se asignó a ${ponente.usuario?.nombre || 'un ponente'} a la actividad "${actividad.titulo}" del evento "${evento.nombre}".`,
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

            notificacionesResponsables.push(notif);
        }

        return [notificacionPonente, ...notificacionesResponsables];
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
