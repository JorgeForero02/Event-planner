const { Actividad, Evento, Lugar, LugarActividad, Ponente, PonenteActividad } = require('../models');
const AuditoriaService = require('../services/auditoriaService');


const crearActividad = async (req, res) => {
    const transaction = await Actividad.sequelize.transaction();

    try {
        const { eventoId } = req.params;
        const {
            titulo,
            hora_inicio,
            hora_fin,
            descripcion,
            fecha_actividad,
            url,
            lugares 
        } = req.body;

        // Validaciones básicas
        if (!titulo || titulo.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'El título de la actividad es requerido y debe tener al menos 3 caracteres'
            });
        }

        if (!hora_inicio || !hora_fin) {
            return res.status(400).json({
                success: false,
                message: 'Las horas de inicio y fin son requeridas'
            });
        }

        if (!fecha_actividad) {
            return res.status(400).json({
                success: false,
                message: 'La fecha de la actividad es requerida'
            });
        }

        const evento = await Evento.findByPk(eventoId);
        if (!evento) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado'
            });
        }

        const actividad = await Actividad.create({
            id_evento: eventoId,
            titulo,
            hora_inicio,
            hora_fin,
            descripcion,
            fecha_actividad,
            url
        }, { transaction });

        if (lugares && Array.isArray(lugares) && lugares.length > 0) {
            const lugarActividades = lugares.map(id_lugar => ({
                id_lugar,
                id_actividad: actividad.id_actividad
            }));
            await LugarActividad.bulkCreate(lugarActividades, { transaction });
        }

        await AuditoriaService.registrar({
            mensaje: `Se creó la actividad: ${titulo} para evento ${evento.titulo}`,
            tipo: 'POST',
            accion: 'crear_actividad',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Actividad creada exitosamente',
            data: {
                id_actividad: actividad.id_actividad,
                titulo: actividad.titulo,
                fecha_actividad: actividad.fecha_actividad,
                hora_inicio: actividad.hora_inicio,
                hora_fin: actividad.hora_fin,
                descripcion: actividad.descripcion,
                url: actividad.url,
                id_evento: actividad.id_evento
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear actividad:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la actividad',
            error: error.message
        });
    }
};

const obtenerActividadesEvento = async (req, res) => {
    try {
        const { eventoId } = req.params;

        const evento = await Evento.findByPk(eventoId);
        if (!evento) {
            return res.status(404).json({
                success: false,
                message: 'Evento no encontrado'
            });
        }

        const actividades = await Actividad.findAll({
            where: { id_evento: eventoId },
            include: [
                {
                    model: Lugar,
                    as: 'lugares',
                    attributes: ['id', 'nombre', 'descripcion'],
                    through: { attributes: [] }
                }
            ],
            order: [['fecha_actividad', 'ASC'], ['hora_inicio', 'ASC']]
        });

        res.json({
            success: true,
            message: 'Actividades obtenidas exitosamente',
            total: actividades.length,
            data: actividades
        });

    } catch (error) {
        console.error('Error al obtener actividades:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener actividades',
            error: error.message
        });
    }
};

const obtenerActividadById = async (req, res) => {
    try {
        const { actividadId } = req.params;

        const actividad = await Actividad.findByPk(actividadId, {
            include: [
                {
                    model: Evento,
                    as: 'evento',
                    attributes: ['id', 'titulo', 'modalidad']
                },
                {
                    model: Lugar,
                    as: 'lugares',
                    attributes: ['id', 'nombre', 'descripcion'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!actividad) {
            return res.status(404).json({
                success: false,
                message: 'Actividad no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Actividad obtenida exitosamente',
            data: actividad
        });

    } catch (error) {
        console.error('Error al obtener actividad:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener actividad',
            error: error.message
        });
    }
};

const actualizarActividad = async (req, res) => {
    const transaction = await Actividad.sequelize.transaction();

    try {
        const { actividadId } = req.params;
        const { titulo, hora_inicio, hora_fin, descripcion, fecha_actividad, url, lugares } = req.body;

        const actividad = await Actividad.findByPk(actividadId);
        if (!actividad) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Actividad no encontrada'
            });
        }

        // Actualizar campos
        const actualizaciones = {};
        if (titulo) actualizaciones.titulo = titulo;
        if (hora_inicio) actualizaciones.hora_inicio = hora_inicio;
        if (hora_fin) actualizaciones.hora_fin = hora_fin;
        if (descripcion !== undefined) actualizaciones.descripcion = descripcion;
        if (fecha_actividad) actualizaciones.fecha_actividad = fecha_actividad;
        if (url !== undefined) actualizaciones.url = url;

        await actividad.update(actualizaciones, { transaction });

        if (lugares && Array.isArray(lugares)) {
            await LugarActividad.destroy({
                where: { id_actividad: actividadId },
                transaction
            });

            if (lugares.length > 0) {
                const lugarActividades = lugares.map(id_lugar => ({
                    id_lugar,
                    id_actividad: actividadId
                }));
                await LugarActividad.bulkCreate(lugarActividades, { transaction });
            }
        }

        await AuditoriaService.registrar({
            mensaje: `Se actualizó la actividad: ${actividad.titulo}`,
            tipo: 'PUT',
            accion: 'actualizar_actividad',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Actividad actualizada exitosamente',
            data: actividad
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar actividad:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar actividad',
            error: error.message
        });
    }
};

const eliminarActividad = async (req, res) => {
    const transaction = await Actividad.sequelize.transaction();

    try {
        const { actividadId } = req.params;

        const actividad = await Actividad.findByPk(actividadId);
        if (!actividad) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Actividad no encontrada'
            });
        }

        await LugarActividad.destroy({
            where: { id_actividad: actividadId },
            transaction
        });

        await PonenteActividad.destroy({
            where: { id_actividad: actividadId },
            transaction
        });

        await actividad.destroy({ transaction });

        await AuditoriaService.registrar({
            mensaje: `Se eliminó la actividad: ${actividad.titulo}`,
            tipo: 'DELETE',
            accion: 'eliminar_actividad',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Actividad eliminada exitosamente'
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al eliminar actividad:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar actividad',
            error: error.message
        });
    }
};

module.exports = {
    crearActividad,
    obtenerActividadesEvento,
    obtenerActividadById,
    actualizarActividad,
    eliminarActividad
};
