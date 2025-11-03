const { Actividad, Evento, Lugar, LugarActividad, Ponente, PonenteActividad } = require('../models');
const AuditoriaService = require('../services/auditoriaService');

const verificarPermisoActividad = async (usuario, actividadId) => {
    const actividad = await Actividad.findByPk(actividadId, {
        include: {
            model: Evento,
            as: 'evento',
            attributes: ['id', 'id_empresa', 'id_creador']
        }
    });

    if (!actividad) {
        return { permiso: false, status: 404, mensaje: 'Actividad no encontrada' };
    }

    const evento = actividad.evento;

    if (usuario.rol === 'administrador') {
        return { permiso: true, actividad, evento };
    }

    if (usuario.rolData.id_empresa !== evento.id_empresa) {
        return { permiso: false, status: 403, mensaje: 'No tiene permiso para gestionar actividades de esta empresa' };
    }

    const esGerente = usuario.rol === 'gerente';
    if (esGerente) {
        return { permiso: true, actividad, evento };
    }

    if (usuario.rol === 'organizador' && evento.id_creador !== usuario.id) {
         return { permiso: false, status: 403, mensaje: 'Como organizador, solo puedes editar actividades de tus propios eventos' };
    }

    return { permiso: true, actividad, evento };
};

const verificarPermisoLectura = async (usuario, actividadId) => {
    const actividad = await Actividad.findByPk(actividadId, {
        include: [
            {
                model: Evento,
                as: 'evento',
                attributes: ['id', 'titulo', 'modalidad', 'id_empresa']
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
        return { permiso: false, status: 404, mensaje: 'Actividad no encontrada' };
    }

    if (usuario.rol === 'administrador' || usuario.rol === 'asistente' || usuario.rol === 'ponente') {
        return { permiso: true, actividad };
    }

    if (usuario.rolData.id_empresa !== actividad.evento.id_empresa) {
        return { permiso: false, status: 403, mensaje: 'No tiene permiso para ver esta actividad' };
    }

    return { permiso: true, actividad };
};

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

        const evento = req.evento; 
        
        if (!titulo || titulo.trim().length < 3) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'El título de la actividad es requerido y debe tener al menos 3 caracteres' });
        }
        if (!hora_inicio || !hora_fin) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Las horas de inicio y fin son requeridas' });
        }
        if (hora_inicio >= hora_fin) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'La hora de inicio debe ser anterior a la hora de fin' });
        }
        if (!fecha_actividad) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'La fecha de la actividad es requerida' });
        }
        const fechaAct = new Date(fecha_actividad);
        const fechaInicioEv = new Date(evento.fecha_inicio);
        const fechaFinEv = new Date(evento.fecha_fin);
        if (fechaAct < fechaInicioEv || fechaAct > fechaFinEv) {
             await transaction.rollback();
             return res.status(400).json({ success: false, message: `La fecha de la actividad (${fecha_actividad}) debe estar dentro del rango del evento (${evento.fecha_inicio} al ${evento.fecha_fin})`});
        }
        if (lugares && Array.isArray(lugares) && lugares.length > 0) {
            const lugaresValidos = await Lugar.findAll({ where: { id: lugares, id_empresa: evento.id_empresa }});
            if (lugaresValidos.length !== lugares.length) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Uno o más de los lugares especificados no son válidos o no pertenecen a esta empresa'});
            }
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
            const lugarActividades = lugares.map(id_lugar => ({ id_lugar, id_actividad: actividad.id_actividad }));
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
            data: actividad
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
        
        const { permiso, status, mensaje, actividad } = await verificarPermisoLectura(req.usuario, actividadId);

        if (!permiso) {
            return res.status(status).json({ success: false, message: mensaje });
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
        
        const { permiso, status, mensaje, actividad, evento } = await verificarPermisoActividad(req.usuario, actividadId);
        
        if (!permiso) {
            await transaction.rollback();
            return res.status(status).json({ success: false, message: mensaje });
        }

        const H_INICIO = hora_inicio || actividad.hora_inicio;
        const H_FIN = hora_fin || actividad.hora_fin;
        if (H_INICIO >= H_FIN) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'La hora de inicio debe ser anterior a la hora de fin' });
        }
        const F_ACTIVIDAD = fecha_actividad || actividad.fecha_actividad;
        const fechaAct = new Date(F_ACTIVIDAD);
        const fechaInicioEv = new Date(evento.fecha_inicio);
        const fechaFinEv = new Date(evento.fecha_fin);
        if (fechaAct < fechaInicioEv || fechaAct > fechaFinEv) {
             await transaction.rollback();
             return res.status(400).json({ success: false, message: `La fecha de la actividad (${F_ACTIVIDAD}) debe estar dentro del rango del evento (${evento.fecha_inicio} al ${evento.fecha_fin})`});
        }
        if (lugares && Array.isArray(lugares)) {
            if (lugares.length > 0) {
                const lugaresValidos = await Lugar.findAll({ where: { id: lugares, id_empresa: evento.id_empresa }});
                if (lugaresValidos.length !== lugares.length) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Uno o más de los lugares especificados no son válidos o no pertenecen a esta empresa'});
                }
            }
            await LugarActividad.destroy({ where: { id_actividad: actividadId }, transaction });
            if (lugares.length > 0) {
                const lugarActividades = lugares.map(id_lugar => ({ id_lugar, id_actividad: actividadId }));
                await LugarActividad.bulkCreate(lugarActividades, { transaction });
            }
        }

        const actualizaciones = {};
        if (titulo !== undefined) actualizaciones.titulo = titulo;
        if (hora_inicio !== undefined) actualizaciones.hora_inicio = hora_inicio;
        if (hora_fin !== undefined) actualizaciones.hora_fin = hora_fin;
        if (descripcion !== undefined) actualizaciones.descripcion = descripcion;
        if (fecha_actividad !== undefined) actualizaciones.fecha_actividad = fecha_actividad;
        if (url !== undefined) actualizaciones.url = url;

        await actividad.update(actualizaciones, { transaction });

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
        
        const { permiso, status, mensaje, actividad } = await verificarPermisoActividad(req.usuario, actividadId);
        
        if (!permiso) {
            await transaction.rollback();
            return res.status(status).json({ success: false, message: mensaje });
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