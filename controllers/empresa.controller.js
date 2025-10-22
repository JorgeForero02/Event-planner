const db = require('../models');
const ApiResponse = require('../utils/response');
const EmailService = require('../services/emailService');
const AuditoriaService = require('../services/auditoriaService');

const Empresa = db.Empresa;
const Usuario = db.Usuario;
const AdministradorEmpresa = db.AdministradorEmpresa;

const STATUS_PENDING = 0;
const STATUS_ACTIVE = 1;
const STATUS_REJECTED = 2;
const ROLE_GERENTE = 1;

const canUserAccessCompany = (userRole, userCompanyId, companyId) => {
  if (userRole === 'administrador') return true;
  if ((userRole === 'gerente' || userRole === 'organizador') && userCompanyId === parseInt(companyId)) {
    return true;
  }
  return false;
};

const buildWhereClause = (rol, incluirPendientes) => {
  if (rol === 'administrador') {
    return incluirPendientes === 'true' ? {} : { estado: STATUS_ACTIVE };
  }
  return { estado: STATUS_ACTIVE };
};

const sendCompanyRegistrationEmail = async (usuario, empresa) => {
  try {
    await EmailService.enviarEmpresaRegistrada(
      usuario.correo,
      usuario.nombre,
      empresa.nombre,
      empresa.nit
    );
  } catch (error) {
    console.error('Error enviando correo:', error);
  }
};

const sendApprovalEmail = async (creador, empresa, aprobar, motivo) => {
  try {
    if (aprobar) {
      await EmailService.enviarEmpresaAprobada(creador.correo, creador.nombre, empresa.nombre);
    } else {
      await EmailService.enviarEmpresaRechazada(
        creador.correo,
        creador.nombre,
        empresa.nombre,
        motivo || 'No se especificó motivo'
      );
    }
  } catch (error) {
    console.error('Error enviando correo:', error);
  }
};

const EmpresaController = {
  getAll: async (req, res, next) => {
    try {
      const { rol, rolData } = req.usuario;
      const { incluir_pendientes } = req.query;
      const whereClause = buildWhereClause(rol, incluir_pendientes);

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

  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rol, rolData } = req.usuario;

      const item = await Empresa.findByPk(id);
      if (!item) {
        return ApiResponse.notFound(res, 'Empresa no encontrada');
      }

      if (!canUserAccessCompany(rol, rolData?.id_empresa, id)) {
        return ApiResponse.forbidden(res, 'No tiene permisos para ver esta empresa');
      }

      return ApiResponse.success(res, item, 'Empresa obtenida correctamente');
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const { rol, id: usuarioId } = req.usuario;

      if (rol !== 'administrador' && rol !== 'asistente') {
        return ApiResponse.forbidden(res, 'Solo los administradores y asistentes pueden crear empresas');
      }

      const estado = rol === 'asistente' ? STATUS_PENDING : STATUS_ACTIVE;
      const empresaData = {
        ...req.body,
        estado,
        ...(rol === 'asistente' && { id_creador: usuarioId })
      };

      const newItem = await Empresa.create(empresaData);

      await AuditoriaService.registrarCreacion('empresa', {
        id: newItem.id,
        nombre: newItem.nombre,
        nit: newItem.nit,
        estado: estado
      }, req.usuario);

      if (rol === 'asistente') {
        const usuario = await Usuario.findByPk(usuarioId);
        await sendCompanyRegistrationEmail(usuario, newItem);
      }

      const message = rol === 'asistente'
        ? 'Empresa creada correctamente. Pendiente de aprobación por el administrador.'
        : 'Empresa creada correctamente';

      return ApiResponse.success(res, newItem, message, 201);
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

      const datosAnteriores = { ...item.toJSON() };
      await item.update(req.body);

      await AuditoriaService.registrarActualizacion(
        'empresa',
        id,
        datosAnteriores,
        item.toJSON(),
        req.usuario
      );

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

      await AuditoriaService.registrarEliminacion('empresa', id, req.usuario);

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

      if (!canUserAccessCompany(rol, rolData?.id_empresa, id)) {
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
        rol: miembro.es_Gerente === ROLE_GERENTE ? 'gerente' : 'organizador'
      }));

      return ApiResponse.success(res, equipoFormateado, 'Equipo obtenido correctamente');
    } catch (error) {
      next(error);
    }
  },

  getPendientes: async (req, res, next) => {
    try {
      const empresasPendientes = await Empresa.findAll({
        where: { estado: STATUS_PENDING },
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

  aprobarEmpresa: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { aprobar, motivo } = req.body;

      const empresa = await Empresa.findByPk(id);
      if (!empresa) {
        return ApiResponse.notFound(res, 'Empresa no encontrada');
      }

      if (empresa.estado !== STATUS_PENDING) {
        return ApiResponse.error(res, 'Esta empresa ya fue procesada anteriormente', 400);
      }

      const nuevoEstado = aprobar ? STATUS_ACTIVE : STATUS_REJECTED;
      await empresa.update({ estado: nuevoEstado });

      await AuditoriaService.registrar({
        mensaje: `Empresa ${empresa.nombre} ${aprobar ? 'aprobada' : 'rechazada'}${!aprobar && motivo ? `. Motivo: ${motivo}` : ''}`,
        tipo: 'UPDATE',
        accion: aprobar ? 'aprobar_empresa' : 'rechazar_empresa',
        usuario: req.usuario
      });

      if (empresa.id_creador) {
        const creador = await Usuario.findByPk(empresa.id_creador);
        if (creador) {
          await sendApprovalEmail(creador, empresa, aprobar, motivo);
        }
      }

      const message = aprobar ? 'Empresa aprobada exitosamente' : 'Empresa rechazada';
      return ApiResponse.success(res, empresa, message);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = EmpresaController;
