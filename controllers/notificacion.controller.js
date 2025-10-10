const db = require('../models');
const ApiResponse = require('../utils/response');
const Notificacion = db.Notificacion;

const NotificacionController = {
  getAll: async (req, res, next) => {
    try {
      const items = await Notificacion.findAll();
      return ApiResponse.success(res, items, 'Lista obtenida correctamente');
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Notificacion.findByPk(id);
      
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
      const newItem = await Notificacion.create(req.body);
      return ApiResponse.success(res, newItem, 'Registro creado correctamente', 201);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Notificacion.findByPk(id);
      
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
      const item = await Notificacion.findByPk(id);
      
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

module.exports = NotificacionController;
