const { Lugar, Ubicacion, Empresa, LugarActividad } = require('../models');
const AuditoriaService = require('../services/auditoriaService');

const crearLugar = async (req, res) => {
    const transaction = await Lugar.sequelize.transaction();

    try {
        const { empresaId, nombre, descripcion, id_ubicacion } = req.body;

        if (!nombre || nombre.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'El nombre es requerido y debe tener al menos 3 caracteres'
            });
        }

        if (!id_ubicacion) {
            return res.status(400).json({
                success: false,
                message: 'La ubicación es requerida'
            });
        }

        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        const ubicacion = await Ubicacion.findOne({
            where: { id: id_ubicacion, id_empresa: empresaId }
        });
        if (!ubicacion) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada o no pertenece a esta empresa'
            });
        }

        const lugar = await Lugar.create({
            id_empresa: empresaId,
            nombre,
            descripcion,
            id_ubicacion
        }, { transaction });

        await AuditoriaService.registrar({
            mensaje: `Se creó el lugar: ${nombre} para empresa ${empresa.nombre}`,
            tipo: 'POST',
            accion: 'crear_lugar',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Lugar creado exitosamente',
            data: {
                id: lugar.id,
                nombre: lugar.nombre,
                descripcion: lugar.descripcion,
                id_ubicacion: lugar.id_ubicacion,
                id_empresa: lugar.id_empresa
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear lugar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el lugar',
            error: error.message
        });
    }
};

const obtenerLugaresEmpresa = async (req, res) => {
    try {
        const { empresaId } = req.params;

        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        const lugares = await Lugar.findAll({
            where: { id_empresa: empresaId },
            include: [
                {
                    model: Ubicacion,
                    as: 'ubicacion',
                    attributes: ['id', 'direccion', 'lugar', 'capacidad']
                }
            ],
            order: [['nombre', 'ASC']]
        });

        res.json({
            success: true,
            message: 'Lugares obtenidos exitosamente',
            total: lugares.length,
            data: lugares
        });

    } catch (error) {
        console.error('Error al obtener lugares:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener lugares',
            error: error.message
        });
    }
};

const obtenerLugarById = async (req, res) => {
    try {
        const { lugarId } = req.params;

        const lugar = await Lugar.findByPk(lugarId, {
            include: [
                {
                    model: Ubicacion,
                    as: 'ubicacion',
                    attributes: ['id', 'direccion', 'lugar', 'capacidad', 'id_empresa']
                },
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['id', 'nombre']
                }
            ]
        });

        if (!lugar) {
            return res.status(404).json({
                success: false,
                message: 'Lugar no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Lugar obtenido exitosamente',
            data: lugar
        });

    } catch (error) {
        console.error('Error al obtener lugar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener lugar',
            error: error.message
        });
    }
};

const actualizarLugar = async (req, res) => {
    const transaction = await Lugar.sequelize.transaction();

    try {
        const { lugarId } = req.params;
        const { nombre, descripcion } = req.body;

        const lugar = await Lugar.findByPk(lugarId);
        if (!lugar) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Lugar no encontrado'
            });
        }

        const actualizaciones = {};
        if (nombre) actualizaciones.nombre = nombre;
        if (descripcion !== undefined) actualizaciones.descripcion = descripcion;

        await lugar.update(actualizaciones, { transaction });

        await AuditoriaService.registrar({
            mensaje: `Se actualizó el lugar: ${lugar.nombre}`,
            tipo: 'PUT',
            accion: 'actualizar_lugar',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Lugar actualizado exitosamente',
            data: lugar
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar lugar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar lugar',
            error: error.message
        });
    }
};

const eliminarLugar = async (req, res) => {
    const transaction = await Lugar.sequelize.transaction();

    try {
        const { lugarId } = req.params;

        const lugar = await Lugar.findByPk(lugarId);
        if (!lugar) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Lugar no encontrado'
            });
        }

        const lugarEnActividades = await LugarActividad.findOne({
            where: { id_lugar: lugarId }
        });

        if (lugarEnActividades) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar un lugar que tiene actividades asociadas'
            });
        }

        await lugar.destroy({ transaction });

        await AuditoriaService.registrar({
            mensaje: `Se eliminó el lugar: ${lugar.nombre}`,
            tipo: 'DELETE',
            accion: 'eliminar_lugar',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Lugar eliminado exitosamente'
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al eliminar lugar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar lugar',
            error: error.message
        });
    }
};

module.exports = {
    crearLugar,
    obtenerLugaresEmpresa,
    obtenerLugarById,
    actualizarLugar,
    eliminarLugar
};
