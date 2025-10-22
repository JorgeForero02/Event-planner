const db = require('../models');
const ApiResponse = require('../utils/response');
const AuditoriaService = require('../services/auditoriaService');

const Ciudad = db.Ciudad;

const CiudadController = {
  getAll: async (req, res, next) => {
    try {
      const items = await Ciudad.findAll();
      return ApiResponse.success(res, items, 'Lista obtenida correctamente');
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Ciudad.findByPk(id);

      if (!item) {
        return ApiResponse.notFound(res, 'Registro no encontrado');
      }

      return ApiResponse.success(res, item, 'Registro obtenido correctamente');
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const newItem = await Ciudad.create(req.body);

      await AuditoriaService.registrarCreacion('ciudad', {
        id: newItem.id,
        nombre: newItem.nombre
      }, req.usuario);

      return ApiResponse.success(res, newItem, 'Registro creado correctamente', 201);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Ciudad.findByPk(id);

      if (!item) {
        return ApiResponse.notFound(res, 'Registro no encontrado');
      }

      const datosAnteriores = { ...item.toJSON() };
      await item.update(req.body);

      await AuditoriaService.registrarActualizacion(
        'ciudad',
        id,
        datosAnteriores,
        item.toJSON(),
        req.usuario
      );

      return ApiResponse.success(res, item, 'Registro actualizado correctamente');
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Ciudad.findByPk(id);

      if (!item) {
        return ApiResponse.notFound(res, 'Registro no encontrado');
      }

      await item.destroy();

      await AuditoriaService.registrarEliminacion('ciudad', id, req.usuario);

      return ApiResponse.success(res, null, 'Registro eliminado correctamente');
    } catch (error) {
      next(error);
    }
  }
};

module.exports = CiudadController;
