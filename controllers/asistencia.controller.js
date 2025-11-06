const { Asistencia, Inscripcion, Evento, Asistente, Usuario } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const ApiResponse = require('../utils/response');
const AuditoriaService = require('../services/auditoriaService');

const AsistenciaController = {
    registrarAsistencia: async (req, res, next) => {
        const transaction = await sequelize.transaction();

        try {
            const { id_inscripcion } = req.body;
            const usuarioId = req.usuario.id;

            const inscripcion = await Inscripcion.findByPk(id_inscripcion, {
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

            if (!inscripcion) {
                await transaction.rollback();
                return ApiResponse.notFound(res, 'Inscripción no encontrada');
            }

            if (inscripcion.estado !== 'Confirmada') {
                await transaction.rollback();
                return ApiResponse.error(
                    res,
                    'No puedes registrar asistencia. Tu inscripción debe estar confirmada.',
                    400
                );
            }

            if (inscripcion.asistente.id_usuario !== usuarioId) {
                await transaction.rollback();
                return ApiResponse.forbidden(
                    res,
                    'No puedes registrar asistencia para otra persona.'
                );
            }

            const evento = inscripcion.evento;
            if (evento.estado !== 1) {
                await transaction.rollback();
                return ApiResponse.error(
                    res,
                    'El evento no está disponible para registro de asistencia.',
                    400
                );
            }

            const fechaHoy = new Date().toISOString().split('T')[0];
            const asistenciaExistente = await Asistencia.findOne({
                where: {
                    inscripcion: id_inscripcion,
                    fecha: fechaHoy
                },
                transaction
            });

            if (asistenciaExistente) {
                await transaction.rollback();
                return ApiResponse.error(
                    res,
                    'Ya has registrado tu asistencia para hoy.',
                    409
                );
            }

            const nuevaAsistencia = await Asistencia.create({
                fecha: fechaHoy,
                estado: 'Presente',
                inscripcion: id_inscripcion
            }, { transaction });

            await AuditoriaService.registrarCreacion(
                'asistencia',
                {
                    id: nuevaAsistencia.id,
                    evento: evento.titulo,
                    asistente: req.usuario.nombre,
                    fecha: fechaHoy
                },
                req.usuario
            );

            await transaction.commit();

            return ApiResponse.success(
                res,
                nuevaAsistencia,
                'Asistencia registrada exitosamente.',
                201
            );

        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    },

    obtenerMisAsistencias: async (req, res, next) => {
        try {
            const usuarioId = req.usuario.id;

            const asistente = await Asistente.findOne({
                where: { id_usuario: usuarioId }
            });

            if (!asistente) {
                return ApiResponse.success(res, [], 'No tienes asistencias registradas.');
            }

            const inscripciones = await Inscripcion.findAll({
                where: { id_asistente: asistente.id_asistente },
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

            return ApiResponse.success(
                res,
                inscripciones,
                'Asistencias obtenidas exitosamente.'
            );

        } catch (error) {
            next(error);
        }
    },

    registrarAsistenciaPorCodigo: async (req, res, next) => {
        const transaction = await sequelize.transaction();

        try {
            const { codigo } = req.body;
            const usuarioId = req.usuario.id;

            const inscripcion = await Inscripcion.findOne({
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

            if (!inscripcion) {
                await transaction.rollback();
                return ApiResponse.notFound(res, 'Código de inscripción no válido');
            }

            if (inscripcion.estado !== 'Confirmada') {
                await transaction.rollback();
                return ApiResponse.error(
                    res,
                    'La inscripción debe estar confirmada para registrar asistencia.',
                    400
                );
            }

            if (inscripcion.asistente.id_usuario !== usuarioId) {
                await transaction.rollback();
                return ApiResponse.forbidden(
                    res,
                    'Este código no te pertenece.'
                );
            }

            const evento = inscripcion.evento;
            if (evento.estado !== 1) {
                await transaction.rollback();
                return ApiResponse.error(
                    res,
                    'El evento no está disponible.',
                    400
                );
            }

            const fechaHoy = new Date().toISOString().split('T')[0];
            if (fechaHoy < evento.fecha_inicio || fechaHoy > evento.fecha_fin) {
                await transaction.rollback();
                return ApiResponse.error(
                    res,
                    'No es posible registrar asistencia fuera de las fechas del evento.',
                    400
                );
            }

            const asistenciaExistente = await Asistencia.findOne({
                where: {
                    inscripcion: inscripcion.id,
                    fecha: fechaHoy
                },
                transaction
            });

            if (asistenciaExistente) {
                await transaction.rollback();
                return ApiResponse.error(
                    res,
                    'Ya has registrado tu asistencia para hoy.',
                    409
                );
            }

            const nuevaAsistencia = await Asistencia.create({
                fecha: fechaHoy,
                estado: 'Presente',
                inscripcion: inscripcion.id
            }, { transaction });

            await AuditoriaService.registrarCreacion(
                'asistencia',
                {
                    id: nuevaAsistencia.id,
                    evento: evento.titulo,
                    asistente: req.usuario.nombre,
                    fecha: fechaHoy,
                    metodo: 'codigo_qr'
                },
                req.usuario
            );

            await transaction.commit();

            return ApiResponse.success(
                res,
                {
                    asistencia: nuevaAsistencia,
                    evento: {
                        titulo: evento.titulo,
                        fecha_inicio: evento.fecha_inicio,
                        fecha_fin: evento.fecha_fin
                    }
                },
                'Asistencia registrada exitosamente mediante código.',
                201
            );

        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    },

    obtenerAsistenciasEvento: async (req, res, next) => {
        try {
            const { id_evento } = req.params;
            const { fecha } = req.query;
            const usuarioId = req.usuario.id;

            const evento = await Evento.findByPk(id_evento, {
                attributes: ['id', 'titulo', 'id_creador', 'id_empresa']
            });

            if (!evento) {
                return ApiResponse.notFound(res, 'Evento no encontrado');
            }

            const esCreador = evento.id_creador === usuarioId;
            const esAdminEmpresa = req.usuario.rolData?.id_empresa === evento.id_empresa;

            if (!esCreador && !esAdminEmpresa && req.usuario.rol !== 'Administrador') {
                return ApiResponse.forbidden(
                    res,
                    'No tienes permiso para ver las asistencias de este evento.'
                );
            }

            const whereAsistencia = {};
            if (fecha) {
                whereAsistencia.fecha = fecha;
            }

            const inscripciones = await Inscripcion.findAll({
                where: { id_evento },
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

            return ApiResponse.success(
                res,
                {
                    evento: evento.titulo,
                    total_inscritos: inscripciones.length,
                    inscripciones
                },
                'Asistencias del evento obtenidas exitosamente.'
            );

        } catch (error) {
            next(error);
        }
    }
};

module.exports = AsistenciaController;
