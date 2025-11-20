const EmpresaService = require('../services/empresa.service');
const EmpresaValidator = require('../validators/empresa.validator');
const PermisosService = require('../services/permisos.service');
const EmailService = require('../services/emailService');
const AuditoriaService = require('../services/auditoriaService');
const ApiResponse = require('../utils/response');
const NotificacionService = require('../services/notificacion.service');
const { MENSAJES, ESTADOS } = require('../constants/empresa.constants');

class EmpresaController {
  async getAll(req, res, next) {
    try {
      const { rol, rolData } = req.usuario;
      const { incluir_pendientes } = req.query;

      const empresas = await EmpresaService.obtenerPorRol(rol, rolData, incluir_pendientes);

      return ApiResponse.success(res, empresas, MENSAJES.LISTA_OBTENIDA);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const { rol, rolData } = req.usuario;

      const empresa = await EmpresaService.buscarPorId(id);

      if (!empresa) {
        return ApiResponse.notFound(res, MENSAJES.NO_ENCONTRADA);
      }

      const tienePermiso = PermisosService.verificarAccesoEmpresa(rol, rolData?.id_empresa, id);

      if (!tienePermiso) {
        return ApiResponse.forbidden(res, MENSAJES.SIN_PERMISO_VER);
      }

      return ApiResponse.success(res, empresa, MENSAJES.OBTENIDA);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { rol, id: usuarioId, nombre, correo } = req.usuario;

      const validacion = EmpresaValidator.validarCreacion(req.body, rol);

      if (!validacion.esValida) {
        return ApiResponse.error(res, validacion.mensaje, 400);
      }

      const resultado = await EmpresaService.crear(req.body, rol, usuarioId);

      await AuditoriaService.registrarCreacion('empresa', {
        id: resultado.empresa.id,
        nombre: resultado.empresa.nombre,
        nit: resultado.empresa.nit,
        estado: resultado.empresa.estado
      }, req.usuario);

      if (rol === 'asistente') {
                const usuarioCreador = { id: usuarioId, nombre: nombre, correo: correo };

                await EmailService.enviarEmpresaRegistrada(
                    usuarioCreador.correo,
                    usuarioCreador.nombre,
                    resultado.empresa.nombre,
                    resultado.empresa.nit
                );

                await NotificacionService.crearNotificacionEmpresaPendiente(
                    resultado.empresa,
                    usuarioCreador
                );
            }

      return ApiResponse.success(res, resultado.empresa, resultado.mensaje, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { rol, rolData } = req.usuario;

      const validacionPermiso = PermisosService.verificarPermisoActualizarEmpresa(rol, rolData, id);

      if (!validacionPermiso.tienePermiso) {
        return ApiResponse.forbidden(res, validacionPermiso.mensaje);
      }

      const resultado = await EmpresaService.actualizar(id, req.body);

      if (!resultado.exito) {
        return ApiResponse.notFound(res, resultado.mensaje);
      }

      await AuditoriaService.registrarActualizacion(
        'empresa',
        id,
        resultado.datosAnteriores,
        resultado.datosNuevos,
        req.usuario
      );

      return ApiResponse.success(res, resultado.empresa, MENSAJES.ACTUALIZADA);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const { rol } = req.usuario;

      if (rol !== 'administrador') {
        return ApiResponse.forbidden(res, MENSAJES.SOLO_ADMIN_ELIMINAR);
      }

      const resultado = await EmpresaService.eliminar(id);

      if (!resultado.exito) {
        return ApiResponse.notFound(res, resultado.mensaje);
      }

      await AuditoriaService.registrarEliminacion('empresa', id, req.usuario);

      return ApiResponse.success(res, null, MENSAJES.ELIMINADA);
    } catch (error) {
      next(error);
    }
  }

  async getEquipo(req, res, next) {
    try {
      const { id } = req.params;
      const { rol, rolData } = req.usuario;

      const empresa = await EmpresaService.buscarPorId(id);

      if (!empresa) {
        return ApiResponse.notFound(res, MENSAJES.NO_ENCONTRADA);
      }

      const tienePermiso = PermisosService.verificarAccesoEmpresa(rol, rolData?.id_empresa, id);

      if (!tienePermiso) {
        return ApiResponse.forbidden(res, MENSAJES.SIN_PERMISO_EQUIPO);
      }

      const equipo = await EmpresaService.obtenerEquipo(id);

      return ApiResponse.success(res, equipo, MENSAJES.EQUIPO_OBTENIDO);
    } catch (error) {
      next(error);
    }
  }

  async getPendientes(req, res, next) {
    try {
      const empresasPendientes = await EmpresaService.obtenerPendientes();

      return ApiResponse.success(res, empresasPendientes, MENSAJES.PENDIENTES_OBTENIDAS);
    } catch (error) {
      next(error);
    }
  }

  async aprobarEmpresa(req, res, next) {
    try {
      const { id } = req.params;
      const { aprobar, motivo } = req.body;

      const resultado = await EmpresaService.procesarAprobacion(id, aprobar, motivo);

      if (!resultado.exito) {
        return ApiResponse.error(res, resultado.mensaje, resultado.codigoEstado || 400);
      }

      await AuditoriaService.registrar({
        mensaje: `Empresa ${resultado.empresa.nombre} ${aprobar ? 'aprobada' : 'rechazada'}${!aprobar && motivo ? `. Motivo: ${motivo}` : ''}`,
        tipo: 'UPDATE',
        accion: aprobar ? 'aprobar_empresa' : 'rechazar_empresa',
        usuario: req.usuario
      });

      if (resultado.creador) {
        if (aprobar) {
          await EmailService.enviarEmpresaAprobada(
            resultado.creador.correo,
            resultado.creador.nombre,
            resultado.empresa.nombre
          );
        } else {
          await EmailService.enviarEmpresaRechazada(
            resultado.creador.correo,
            resultado.creador.nombre,
            resultado.empresa.nombre,
            motivo || 'No se especificó motivo'
          );
        }
          await NotificacionService.crearNotificacionRespuestaEmpresa(
            resultado.creador,
            resultado.empresa,
            aprobar,
            motivo
          );
      }

      return ApiResponse.success(res, resultado.empresa, resultado.mensaje);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmpresaController();