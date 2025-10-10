const db = require('../models');
const ApiResponse = require('../utils/response');
const Asistencia = db.Asistencia;

const AsistenciaController = {
  getAll: async (req, res, next) => {
    try {
      const items = await Asistencia.findAll();
      return ApiResponse.success(res, items, 'Lista obtenida correctamente');
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Asistencia.findByPk(id);
      
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
      const newItem = await Asistencia.create(req.body);
      return ApiResponse.success(res, newItem, 'Registro creado correctamente', 201);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Asistencia.findByPk(id);
      
      if (!item) {
        return ApiResponse.notFound(res, 'Registro no encontrado');
      }
      
      await item.update(req.body);
      return ApiResponse.success(res, item, 'Registro actualizado correctamente');
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Asistencia.findByPk(id);
      
      if (!item) {
        return ApiResponse.notFound(res, 'Registro no encontrado');
      }
      
      await item.destroy();
      return ApiResponse.success(res, null, 'Registro eliminado correctamente');
    } catch (error) {
      next(error);
    }
  }
};

module.exports = AsistenciaController;
