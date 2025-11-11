const { Asistencia, Inscripcion, Evento, Asistente, Usuario } = require('../models');
const sequelize = require('../config/database');

class AsistenciaService {
    crearTransaccion() {
        return sequelize.transaction();
    }

    obtenerFechaHoy() {
        return new Date().toISOString().split('T')[0];
    }

    async buscarInscripcionPorId(id, transaction) {
        return await Inscripcion.findByPk(id, {
            include: [
                {
                    model: Evento,
                    as: 'evento',
                    attributes: ['id', 'titulo', 'estado', 'fecha_inicio', 'fecha_fin']
                },
                {
                    model: Asistente,
                    as: 'asistente',
                    attributes: ['id_asistente', 'id_usuario']
                }
            ],
            transaction
        });
    }

    async buscarInscripcionPorCodigo(codigo, transaction) {
        return await Inscripcion.findOne({
            where: { codigo },
            include: [
                {
                    model: Evento,
                    as: 'evento',
                    attributes: ['id', 'titulo', 'estado', 'fecha_inicio', 'fecha_fin']
                },
                {
                    model: Asistente,
                    as: 'asistente',
                    attributes: ['id_asistente', 'id_usuario']
                }
            ],
            transaction
        });
    }

    async buscarEventoPorId(eventoId) {
        return await Evento.findByPk(eventoId, {
            attributes: ['id', 'titulo', 'id_creador', 'id_empresa']
        });
    }

    async buscarAsistentePorUsuario(usuarioId) {
        return await Asistente.findOne({
            where: { id_usuario: usuarioId }
        });
    }

    async verificarAsistenciaExistente(inscripcionId, fecha, transaction) {
        const asistencia = await Asistencia.findOne({
            where: {
                inscripcion: inscripcionId,
                fecha
            },
            transaction
        });
        return !!asistencia;
    }

    async crear(datosAsistencia, transaction) {
        return await Asistencia.create(datosAsistencia, { transaction });
    }

    async obtenerInscripcionesConAsistencias(asistenteId) {
        return await Inscripcion.findAll({
            where: { id_asistente: asistenteId },
            attributes: ['id', 'id_evento', 'codigo'],
            include: [
                {
                    model: Evento,
                    as: 'evento',
                    attributes: ['id', 'titulo', 'fecha_inicio', 'fecha_fin']
                },
                {
                    model: Asistencia,
                    as: 'asistencias',
                    attributes: ['id', 'fecha', 'estado']
                }
            ],
            order: [
                ['id', 'DESC'],
                [{ model: Asistencia, as: 'asistencias' }, 'fecha', 'DESC']
            ]
        });
    }

    async obtenerAsistenciasPorEvento(eventoId, fecha = null) {
        const whereAsistencia = {};
        if (fecha) {
            whereAsistencia.fecha = fecha;
        }

        return await Inscripcion.findAll({
            where: { id_evento: eventoId },
            include: [
                {
                    model: Asistente,
                    as: 'asistente',
                    include: [{
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id', 'nombre', 'correo', 'cedula']
                    }]
                },
                {
                    model: Asistencia,
                    as: 'asistencias',
                    where: whereAsistencia,
                    required: false,
                    attributes: ['id', 'fecha', 'estado']
                }
            ],
            order: [
                [{ model: Asistencia, as: 'asistencias' }, 'fecha', 'DESC']
            ]
        });
    }
}

module.exports = new AsistenciaService();
