const { Encuesta, RespuestaEncuesta, Evento, Actividad, Inscripcion, Asistente, Usuario } = require('../models');
const { Op } = require('sequelize');
const { ESTADOS_ENCUESTA, ESTADOS_RESPUESTA } = require('../constants/encuesta.constants');
const crypto = require('crypto');

class EncuestaService {
    crearTransaccion() {
        return Encuesta.sequelize.transaction();
    }

    generarToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    construirURLConParametros(urlBase, parametros) {
        const url = new URL(urlBase);
        Object.keys(parametros).forEach(key => {
            url.searchParams.append(key, parametros[key]);
        });
        return url.toString();
    }

    async crear(datosEncuesta, transaction) {
        const encuesta = await Encuesta.create({
            ...datosEncuesta,
            estado: datosEncuesta.estado || ESTADOS_ENCUESTA.BORRADOR
        }, { transaction });

        return encuesta;
    }

    async actualizar(encuestaId, datosActualizacion, transaction) {
        const encuesta = await Encuesta.findByPk(encuestaId);

        if (!encuesta) {
            throw new Error('Encuesta no encontrada');
        }

        const actualizaciones = this._construirActualizaciones(datosActualizacion);
        await encuesta.update(actualizaciones, { transaction });

        return encuesta;
    }

    async eliminar(encuestaId, transaction) {
        const encuesta = await Encuesta.findByPk(encuestaId);

        if (!encuesta) {
            throw new Error('Encuesta no encontrada');
        }

        await RespuestaEncuesta.destroy({
            where: { id_encuesta: encuestaId },
            transaction
        });

        await encuesta.destroy({ transaction });
    }

    async buscarPorId(encuestaId) {
        return await Encuesta.findByPk(encuestaId, {
            include: [
                {
                    model: Evento,
                    as: 'evento',
                    attributes: ['id', 'titulo', 'fecha_inicio', 'fecha_fin']
                },
                {
                    model: Actividad,
                    as: 'actividad',
                    attributes: ['id_actividad', 'titulo', 'fecha_actividad', 'hora_inicio', 'hora_fin']
                }
            ]
        });
    }

    async obtenerPorEvento(eventoId) {
        return await Encuesta.findAll({
            where: { id_evento: eventoId },
            include: [
                {
                    model: RespuestaEncuesta,
                    as: 'respuestas',
                    attributes: ['id', 'estado', 'fecha_envio', 'fecha_completado']
                }
            ],
            order: [['fecha_creacion', 'DESC']]
        });
    }

    async obtenerPorActividad(actividadId) {
        return await Encuesta.findAll({
            where: { id_actividad: actividadId },
            include: [
                {
                    model: RespuestaEncuesta,
                    as: 'respuestas',
                    attributes: ['id', 'estado', 'fecha_envio', 'fecha_completado']
                }
            ],
            order: [['fecha_creacion', 'DESC']]
        });
    }

    async obtenerEncuestasActivas(filtros = {}) {
        const where = { estado: ESTADOS_ENCUESTA.ACTIVA };
        const fechaHoy = new Date().toISOString().split('T')[0];

        where.fecha_inicio = { [Op.lte]: fechaHoy };
        where[Op.or] = [
            { fecha_fin: null },
            { fecha_fin: { [Op.gte]: fechaHoy } }
        ];

        if (filtros.id_evento) where.id_evento = filtros.id_evento;
        if (filtros.id_actividad) where.id_actividad = filtros.id_actividad;
        if (filtros.tipo_encuesta) where.tipo_encuesta = filtros.tipo_encuesta;

        return await Encuesta.findAll({
            where,
            order: [['fecha_inicio', 'ASC']]
        });
    }

    async enviarEncuestaAsistente(encuestaId, asistenteId, transaction) {
        const encuesta = await this.buscarPorId(encuestaId);

        if (!encuesta) {
            throw new Error('Encuesta no encontrada');
        }

        const yaEnviada = await RespuestaEncuesta.findOne({
            where: {
                id_encuesta: encuestaId,
                id_asistente: asistenteId
            }
        });

        if (yaEnviada) {
            return yaEnviada;
        }

        const token = this.generarToken();

        const respuesta = await RespuestaEncuesta.create({
            id_encuesta: encuestaId,
            id_asistente: asistenteId,
            token_acceso: token,
            estado: ESTADOS_RESPUESTA.PENDIENTE,
            fecha_envio: new Date()
        }, { transaction });

        return {
            respuesta,
            url_personalizada: this.construirURLConParametros(encuesta.url_google_form, {
                'entry.asistente_id': asistenteId,
                'entry.token': token
            })
        };
    }

    async enviarEncuestasMasivas(encuestaId, transaction) {
        const encuesta = await this.buscarPorId(encuestaId);

        if (!encuesta) {
            throw new Error('Encuesta no encontrada');
        }

        let asistentes = [];

        if (encuesta.id_evento) {
            const inscripciones = await Inscripcion.findAll({
                where: {
                    id_evento: encuesta.id_evento,
                    estado: { [Op.in]: ['Confirmada', 'Pendiente'] }
                },
                include: [{
                    model: Asistente,
                    as: 'asistente',
                    required: true,
                    include: [{
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id', 'nombre', 'correo'],
                        required: true
                    }]
                }]
            });

            asistentes = inscripciones.map(i => ({
                id: i.asistente.id,
                nombre: i.asistente.usuario.nombre,
                correo: i.asistente.usuario.correo
            }));
        }

        const envios = [];
        for (const asistente of asistentes) {
            const resultado = await this.enviarEncuestaAsistente(
                encuestaId,
                asistente.id,
                transaction
            );

            envios.push({
                asistente,
                url: resultado.url_personalizada,
                token: resultado.respuesta.token_acceso
            });
        }

        return envios;
    }

    async marcarComoCompletada(token) {
        const respuesta = await RespuestaEncuesta.findOne({
            where: { token_acceso: token }
        });

        if (!respuesta) {
            throw new Error('Token inválido');
        }

        if (respuesta.estado === ESTADOS_RESPUESTA.COMPLETADA) {
            throw new Error('La encuesta ya fue completada');
        }

        await respuesta.update({
            estado: ESTADOS_RESPUESTA.COMPLETADA,
            fecha_completado: new Date()
        });

        return respuesta;
    }

    async obtenerEstadisticas(encuestaId) {
        const encuesta = await this.buscarPorId(encuestaId);

        if (!encuesta) {
            throw new Error('Encuesta no encontrada');
        }

        const totalEnviadas = await RespuestaEncuesta.count({
            where: { id_encuesta: encuestaId }
        });

        const totalCompletadas = await RespuestaEncuesta.count({
            where: {
                id_encuesta: encuestaId,
                estado: ESTADOS_RESPUESTA.COMPLETADA
            }
        });

        const totalPendientes = await RespuestaEncuesta.count({
            where: {
                id_encuesta: encuestaId,
                estado: ESTADOS_RESPUESTA.PENDIENTE
            }
        });

        const tasaRespuesta = totalEnviadas > 0
            ? ((totalCompletadas / totalEnviadas) * 100).toFixed(2)
            : 0;

        const respuestas = await RespuestaEncuesta.findAll({
            where: { id_encuesta: encuestaId },
            include: [{
                model: Inscripcion,
                as: 'asistente',
                include: [{
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'correo']
                }]
            }],
            order: [['fecha_envio', 'DESC']]
        });

        return {
            encuesta: encuesta.toJSON(),
            estadisticas: {
                total_enviadas: totalEnviadas,
                total_completadas: totalCompletadas,
                total_pendientes: totalPendientes,
                tasa_respuesta: `${tasaRespuesta}%`
            },
            respuestas: respuestas.map(r => ({
                id: r.id,
                asistente: r.asistente?.usuario || null,
                estado: r.estado,
                fecha_envio: r.fecha_envio,
                fecha_completado: r.fecha_completado
            }))
        };
    }

    _construirActualizaciones(datos) {
        const camposPermitidos = [
            'titulo',
            'tipo_encuesta',
            'momento',
            'url_google_form',
            'url_respuestas',
            'estado',
            'fecha_inicio',
            'fecha_fin',
            'obligatoria',
            'descripcion'
        ];

        const actualizaciones = {};
        camposPermitidos.forEach(campo => {
            if (datos[campo] !== undefined) {
                actualizaciones[campo] = datos[campo];
            }
        });

        return actualizaciones;
    }
}

module.exports = new EncuestaService();
