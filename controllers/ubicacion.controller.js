const { Ubicacion, Ciudad, Empresa } = require('../models');
const AuditoriaService = require('../services/auditoriaService');

const crearUbicacion = async (req, res) => {
    const transaction = await Ubicacion.sequelize.transaction();

    try {
        const { empresaId, lugar, direccion, capacidad, descripcion, id_ciudad } = req.body;

        if (!direccion || direccion.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'La dirección es requerida y debe tener al menos 3 caracteres'
            });
        }

        if (!id_ciudad) {
            return res.status(400).json({
                success: false,
                message: 'La ciudad es requerida'
            });
        }

        const empresa = await Empresa.findByPk(empresaId);
        console.log('Empresa encontrada:', empresa);
        if (!empresa) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        const ciudad = await Ciudad.findByPk(id_ciudad);
        if (!ciudad) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Ciudad no encontrada'
            });
        }

        const ubicacion = await Ubicacion.create({
            id_empresa: empresaId,
            lugar,
            direccion,
            capacidad,
            descripcion,
            id_ciudad
        }, { transaction });

        await AuditoriaService.registrar({
            mensaje: `Se creó la ubicación: ${direccion} para empresa ${empresa.nombre}`,
            tipo: 'POST',
            accion: 'crear_ubicacion',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Ubicación creada exitosamente',
            data: {
                id: ubicacion.id,
                lugar: ubicacion.lugar,
                direccion: ubicacion.direccion,
                capacidad: ubicacion.capacidad,
                descripcion: ubicacion.descripcion,
                id_empresa: ubicacion.id_empresa,
                id_ciudad: ubicacion.id_ciudad
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear ubicación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la ubicación',
            error: error.message
        });
    }
};

const obtenerUbicacionesEmpresa = async (req, res) => {
    try {
        const { empresaId } = req.params;

        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        const ubicaciones = await Ubicacion.findAll({
            where: { id_empresa: empresaId },
            include: [
                {
                    model: Ciudad,
                    as: 'ciudad',
                    attributes: ['id', 'nombre']
                }
            ],
            order: [['direccion', 'ASC']]
        });

        res.json({
            success: true,
            message: 'Ubicaciones obtenidas exitosamente',
            total: ubicaciones.length,
            data: ubicaciones
        });

    } catch (error) {
        console.error('Error al obtener ubicaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ubicaciones',
            error: error.message
        });
    }
};

const obtenerUbicacionById = async (req, res) => {
    try {
        const { ubicacionId } = req.params;

        const ubicacion = await Ubicacion.findByPk(ubicacionId, {
            include: [
                {
                    model: Ciudad,
                    as: 'ciudad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['id', 'nombre']
                }
            ]
        });

        if (!ubicacion) {
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Ubicación obtenida exitosamente',
            data: ubicacion
        });

    } catch (error) {
        console.error('Error al obtener ubicación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ubicación',
            error: error.message
        });
    }
};

const actualizarUbicacion = async (req, res) => {
    const transaction = await Ubicacion.sequelize.transaction();

    try {
        const { ubicacionId } = req.params;
        const { lugar, direccion, capacidad, descripcion } = req.body;

        const ubicacion = await Ubicacion.findByPk(ubicacionId);
        if (!ubicacion) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada'
            });
        }

        const actualizaciones = {};
        if (lugar) actualizaciones.lugar = lugar;
        if (direccion) actualizaciones.direccion = direccion;
        if (capacidad !== undefined) actualizaciones.capacidad = capacidad;
        if (descripcion !== undefined) actualizaciones.descripcion = descripcion;

        await ubicacion.update(actualizaciones, { transaction });

        await AuditoriaService.registrar({
            mensaje: `Se actualizó la ubicación: ${ubicacion.direccion}`,
            tipo: 'PUT',
            accion: 'actualizar_ubicacion',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Ubicación actualizada exitosamente',
            data: ubicacion
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar ubicación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar ubicación',
            error: error.message
        });
    }
};

const eliminarUbicacion = async (req, res) => {
    const transaction = await Ubicacion.sequelize.transaction();

    try {
        const { ubicacionId } = req.params;

        const ubicacion = await Ubicacion.findByPk(ubicacionId);
        if (!ubicacion) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Ubicación no encontrada'
            });
        }

        await ubicacion.destroy({ transaction });

        await AuditoriaService.registrar({
            mensaje: `Se eliminó la ubicación: ${ubicacion.direccion}`,
            tipo: 'DELETE',
            accion: 'eliminar_ubicacion',
            usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Ubicación eliminada exitosamente'
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al eliminar ubicación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar ubicación',
            error: error.message
        });
    }
};

module.exports = {
    crearUbicacion,
    obtenerUbicacionesEmpresa,
    obtenerUbicacionById,
    actualizarUbicacion,
    eliminarUbicacion
};
