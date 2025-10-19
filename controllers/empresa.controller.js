const db = require('../models');
const ApiResponse = require('../utils/response');
const EmailService = require('../services/emailService');
const Empresa = db.Empresa;
const Usuario = db.Usuario;
const AdministradorEmpresa = db.AdministradorEmpresa;

const EmpresaController = {
  // GET ALL - Admin ve todas, Gerente/Organizador solo su empresa
  getAll: async (req, res, next) => {
    try {
      const { rol, rolData } = req.usuario;
      const { incluir_pendientes } = req.query; // Solo admin puede ver pendientes
      
      let whereClause = {};
      
      // Admin puede ver todas o solo activas
      if (rol === 'administrador') {
        if (incluir_pendientes !== 'true') {
          whereClause.estado = 1; // Solo activas
        }
        // Si incluir_pendientes es true, no filtra por estado
      } else {
        // Otros roles solo ven activas
        whereClause.estado = 1;
      }

      let items;
      if (rol === 'administrador') {
        items = await Empresa.findAll({
          where: whereClause,
          order: [['id', 'ASC']]
        });
      } else if (rol === 'gerente' || rol === 'organizador') {
        items = await Empresa.findAll({
          where: { 
            id: rolData.id_empresa,
            ...whereClause 
          },
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

  // GET BY ID
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rol, rolData } = req.usuario;

      // Buscar la empresa
      const item = await Empresa.findByPk(id);

      if (!item) {
        return ApiResponse.notFound(res, 'Empresa no encontrada');
      }

      // Verificar permisos
      if ((rol === 'gerente' || rol === 'organizador') && rolData.id_empresa !== parseInt(id)) {
        return ApiResponse.forbidden(res, 'No tiene permisos para ver esta empresa');
      }

      return ApiResponse.success(res, item, 'Empresa obtenida correctamente');
    } catch (error) {
      next(error);
    }
  },

  // CREATE
  create: async (req, res, next) => {
    try {
      const { rol, id: usuarioId } = req.usuario;

      if (rol !== 'administrador' && rol !== 'asistente') {
        return ApiResponse.forbidden(res, 'Solo los administradores y asistentes pueden crear empresas');
      }

      if (rol === 'asistente') {
        req.body.estado = 0;  
        req.body.id_creador = usuarioId; 
      } else {
        req.body.estado = 1;
      }

      const newItem = await Empresa.create(req.body);

      // ENVIAR CORREO si es asistente
      if (rol === 'asistente') {
        try {
          const usuario = await Usuario.findByPk(usuarioId);
          await EmailService.enviarEmpresaRegistrada(
            usuario.correo,
            usuario.nombre,
            newItem.nombre,
            newItem.nit
          );
        } catch (emailError) {
          console.error('Error enviando correo:', emailError);
        }
      }

      return ApiResponse.success(
        res, 
        newItem, 
        rol === 'asistente' 
          ? 'Empresa creada correctamente. Pendiente de aprobación por el administrador.'
          : 'Empresa creada correctamente',
        201
      );
    } catch (error) {
      next(error);
    }
  },

  // UPDATE
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

  // DELETE
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

  // GET EQUIPO
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
  },

  // NUEVO: GET EMPRESAS PENDIENTES (Solo administrador)
  getPendientes: async (req, res, next) => {
    try {
      const empresasPendientes = await Empresa.findAll({
        where: { estado: 0 },
        include: [{
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'correo', 'telefono']
        }],
        order: [['id', 'DESC']]
      });

      return ApiResponse.success(res, empresasPendientes, 'Empresas pendientes obtenidas correctamente');
    } catch (error) {
      next(error);
    }
  },

  // NUEVO: APROBAR O RECHAZAR EMPRESA (Solo administrador)
  aprobarEmpresa: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { aprobar, motivo } = req.body; 

      const empresa = await Empresa.findByPk(id);

      if (!empresa) {
        return ApiResponse.notFound(res, 'Empresa no encontrada');
      }

      if (empresa.estado !== 0) {
        return ApiResponse.error(res, 'Esta empresa ya fue procesada anteriormente', 400);
      }

      const nuevoEstado = aprobar ? 1 : 2;
      await empresa.update({ estado: nuevoEstado });

      if (empresa.id_creador) {
        const creador = await Usuario.findByPk(empresa.id_creador);

        if (creador) {
          try {
            if (aprobar) {
              await EmailService.enviarEmpresaAprobada(
                creador.correo,
                creador.nombre,
                empresa.nombre
              );
            } else {
              await EmailService.enviarEmpresaRechazada(
                creador.correo,
                creador.nombre,
                empresa.nombre,
                motivo || 'No se especificó motivo'
              );
            }
          } catch (emailError) {
            console.error('Error enviando correo:', emailError);
          }
        }
      }

      return ApiResponse.success(
        res,
        empresa,
        aprobar ? 'Empresa aprobada exitosamente' : 'Empresa rechazada'
      );
    } catch (error) {
      next(error);
    }
  }
};

module.exports = EmpresaController;
