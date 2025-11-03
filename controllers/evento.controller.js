const { Evento, Empresa, Usuario, Actividad, Inscripcion, Notificacion, Lugar } = require('../models');
const AuditoriaService = require('../services/auditoriaService');

const crearEvento = async (req, res) => {
    const transaction = await Evento.sequelize.transaction();
    try {
        const {
            titulo,
            descripcion,
            modalidad,
            hora,
            cupos,
            fecha_inicio,
            fecha_fin,
            id_empresa
        } = req.body;

        if (!titulo || titulo.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'El título es requerido y debe tener al menos 3 caracteres'
            });
        }

        if (!modalidad || !['Presencial', 'Virtual', 'Híbrida'].includes(modalidad)) {
            return res.status(400).json({
                success: false,
                message: 'La modalidad debe ser: Presencial, Virtual o Híbrida'
            });
        }

        if (!fecha_inicio) {
            return res.status(400).json({
                success: false,
                message: 'La fecha de inicio es requerida'
            });
        }

        if (!fecha_fin) {
            return res.status(400).json({
                success: false,
                message: 'La fecha de fin es requerida'
            });
        }

        if (new Date(fecha_inicio) > new Date(fecha_fin)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'La fecha de inicio debe ser anterior a la fecha de fin'
            });
        }

        const usuarioId = req.usuario.id;
        const empresaId = id_empresa || req.adminEmpresa.id_empresa;

        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'La empresa especificada no existe'
            });
        }

        if (empresa.estado !== 1) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden crear eventos en empresas aprobadas'
            });
        }

        const evento = await Evento.create({
            titulo,
            descripcion,
            modalidad,
            hora,
            cupos,
            fecha_inicio,
            fecha_fin,
            id_empresa: empresaId,
            id_creador: usuarioId,
            estado: 0,
            fecha_creacion: new Date(),
            fecha_actualizacion: new Date()
        }, { transaction });

        await AuditoriaService.registrar({
            mensaje: `Se creó el evento: ${titulo}`,
            tipo: 'POST',
            accion: 'crear_evento',
            usuario: { id: usuarioId, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Evento creado exitosamente',
            data: {
                id: evento.id,
                titulo: evento.titulo,
                modalidad: evento.modalidad,
                estado: evento.estado,
                fecha_inicio: evento.fecha_inicio,
                fecha_fin: evento.fecha_fin,
                id_empresa: evento.id_empresa,
                id_creador: evento.id_creador
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear evento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el evento',
            error: error.message
        });
    }
};

const obtenerEventos = async (req, res) => {
    try {
        const { id_empresa, estado, modalidad } = req.query;
        const { Op } = require('sequelize');

        const where = {};
        if (id_empresa) where.id_empresa = id_empresa;
        if (estado !== undefined) where.estado = estado;
        if (modalidad) where.modalidad = modalidad;

        const eventos = await Evento.findAll({
            where,
            include: [
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['id', 'nombre', 'correo']
                },
                {
                    model: Actividad,
                    as: 'actividades',
                    attributes: ['id_actividad', 'titulo', 'fecha_actividad']
                }
            ],
            order: [['fecha_creacion', 'DESC']]
        });

        res.json({
            success: true,
            message: 'Eventos obtenidos exitosamente',
            total: eventos.length,
            data: eventos
        });

    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener eventos',
            error: error.message
        });
    }
};

const obtenerEventoById = async (req, res) => {
    try {
        const { eventoId } = req.params;

        const evento = await Evento.findByPk(eventoId, {
            include: [
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['id', 'nombre', 'correo']
                },
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['id', 'nombre', 'correo']
                },
                {
                    model: Actividad,
                    as: 'actividades',
                    
                    include: [
                        {
                            model: Lugar,
                            as: 'lugares',
                            // Seleccionamos solo los campos que quieres mostrar
                            attributes: ['id', 'nombre'], 
                            // Excluimos la tabla intermedia (LugarActividad)
                            through: { attributes: [] } 
                        }
                    ]
                    
                },
                {
                    model: Inscripcion,
                    as: 'inscripciones',
                    attributes: ['id', 'fecha', 'estado']
                }
            ]
        });

        if (!evento) {
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Evento obtenido exitosamente',
            data: evento
        });

    } catch (error) {
        console.error('Error al obtener evento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener evento',
            error: error.message
        });
    }
};

const actualizarEvento = async (req, res) => {
    const transaction = await Evento.sequelize.transaction();

    try {
        const eventoActualizado = req.evento;
        const camposPermitidos = ['titulo', 'descripcion', 'modalidad', 'hora', 'cupos', 'estado'];
        const actualizaciones = {};
        const ESTADOS_PERMITIDOS = [0, 1, 2, 3]; // 0=Borrador, 1=Publicado, 2=Cancelado, 3=Finalizado

        if (req.body.estado !== undefined) {
            const estadoInt = parseInt(req.body.estado);
            if (!ESTADOS_PERMITIDOS.includes(estadoInt)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Estado no válido. Los valores permitidos son: ${ESTADOS_PERMITIDOS.join(', ')}.`
                });
            }
        }

        camposPermitidos.forEach(campo => {
            if (req.body[campo] !== undefined) {
                actualizaciones[campo] = req.body[campo];
            }
        });

        actualizaciones.fecha_actualizacion = new Date();

        await eventoActualizado.update(actualizaciones, { transaction });

        await AuditoriaService.registrar({
            mensaje: `Se actualizó el evento: ${eventoActualizado.titulo}`,
            tipo: 'PUT',
            accion: 'actualizar_evento',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Evento actualizado exitosamente',
            data: eventoActualizado
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar evento:', error);

        res.status(500).json({
            success: false,
            message: 'Error al actualizar evento',
            error: error.message
        });
    }
};

const eliminarEvento = async (req, res) => {
    const transaction = await Evento.sequelize.transaction();

    try {
        const eventoActualizado = req.evento;

        await eventoActualizado.update(
            { estado: 2, fecha_actualizacion: new Date() },
            { transaction }
        );

        await AuditoriaService.registrar({
            mensaje: `Se canceló el evento: ${eventoActualizado.titulo}`,
            tipo: 'DELETE',
            accion: 'cancelar_evento',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Evento cancelado exitosamente'
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al eliminar evento:', error);

        res.status(500).json({
            success: false,
            message: 'Error al cancelar evento',
            error: error.message
        });
    }
};

module.exports = {
    crearEvento,
    obtenerEventos,
    obtenerEventoById,
    actualizarEvento,
    eliminarEvento
};
