const db = require('../models');
const ApiResponse = require('../utils/response');
const Empresa = db.Empresa;
const AdministradorEmpresa = db.AdministradorEmpresa;

const EmpresaController = {
  // GET ALL - Admin ve todas, Gerente/Organizador solo su empresa
  getAll: async (req, res, next) => {
    try {
      const { rol, rolData } = req.usuario;
      let items;

      if (rol === 'administrador') {
        items = await Empresa.findAll({
          order: [['id', 'ASC']]
        });
      } else if (rol === 'gerente' || rol === 'organizador') {
        items = await Empresa.findAll({
          where: { id: rolData.id_empresa },
          order: [['id', 'ASC']]
        });
      } else {
        return ApiResponse.forbidden(res, 'No tiene permisos para ver empresas');
      }

      return ApiResponse.success(res, items, 'Lista obtenida correctamente');
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rol, rolData } = req.usuario;

      // Buscar la empresa
      const item = await Empresa.findByPk(id);
      
      if (!item) {
        return ApiResponse.notFound(res, 'Empresa no encontrada');
      }

      if ((rol === 'gerente' || rol === 'organizador') && rolData.id_empresa !== parseInt(id)) {
        return ApiResponse.forbidden(res, 'No tiene permisos para ver esta empresa');
      }

      return ApiResponse.success(res, item, 'Empresa obtenida correctamente');
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const { rol } = req.usuario;

      if (rol !== 'administrador') {
        return ApiResponse.forbidden(res, 'Solo los administradores pueden crear empresas');
      }

      const newItem = await Empresa.create(req.body);
      return ApiResponse.success(res, newItem, 'Empresa creada correctamente', 201);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rol, rolData } = req.usuario;

      if (rol === 'organizador') {
        return ApiResponse.forbidden(res, 'Los organizadores no pueden actualizar información de la empresa. Contacte a su gerente.');
      }

      const item = await Empresa.findByPk(id);
      
      if (!item) {
        return ApiResponse.notFound(res, 'Empresa no encontrada');
      }

      if (rol === 'gerente' && rolData.id_empresa !== parseInt(id)) {
        return ApiResponse.forbidden(res, 'No tiene permisos para actualizar esta empresa');
      }

      await item.update(req.body);
      return ApiResponse.success(res, item, 'Empresa actualizada correctamente');
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rol } = req.usuario;

      if (rol !== 'administrador') {
        return ApiResponse.forbidden(res, 'Solo los administradores pueden eliminar empresas');
      }

      const item = await Empresa.findByPk(id);
      
      if (!item) {
        return ApiResponse.notFound(res, 'Empresa no encontrada');
      }

      await item.destroy();
      return ApiResponse.success(res, null, 'Empresa eliminada correctamente');
    } catch (error) {
      next(error);
    }
  },

  getEquipo: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rol, rolData } = req.usuario;

      const empresa = await Empresa.findByPk(id);
      if (!empresa) {
        return ApiResponse.notFound(res, 'Empresa no encontrada');
      }

      if ((rol === 'gerente' || rol === 'organizador') && rolData.id_empresa !== parseInt(id)) {
        return ApiResponse.forbidden(res, 'No tiene permisos para ver el equipo de esta empresa');
      }

      const equipo = await AdministradorEmpresa.findAll({
        where: { id_empresa: id },
        include: [{
          model: db.Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'cedula', 'telefono', 'correo']
        }],
        order: [['es_Gerente', 'DESC'], ['id', 'ASC']]
      });

      const equipoFormateado = equipo.map(miembro => ({
        id: miembro.id,
        usuario: miembro.usuario,
        rol: miembro.es_Gerente === 1 ? 'gerente' : 'organizador'
      }));

      return ApiResponse.success(res, equipoFormateado, 'Equipo obtenido correctamente');
    } catch (error) {
      next(error);
    }
  }
};

module.exports = EmpresaController;
