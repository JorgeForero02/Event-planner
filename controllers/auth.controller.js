const AuthService = require('../services/auth.service');
const UsuarioService = require('../services/usuario.service');
const AuthValidator = require('../validators/auth.validator');
const TokenService = require('../services/token.service');
const AuditoriaService = require('../services/auditoriaService');
const EmailService = require('../services/emailService');
const NotificacionService = require('../services/notificacion.service');
const ApiResponse = require('../utils/response');
const { CODIGOS_HTTP, MENSAJES, ROLES_PERMITIDOS } = require('../constants/auth.constants');

class AuthController {
    async register(req, res) {
        try {
            const { nombre, cedula, telefono, correo, contraseña, rol, especialidad } = req.body;

            const validacion = AuthValidator.validarRegistro(req.body);
            if (!validacion.esValida) {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: validacion.mensaje
                });
            }

            const rolFinal = rol || 'asistente';

            if (!ROLES_PERMITIDOS.PUBLICOS.includes(rolFinal)) {
                return res.status(CODIGOS_HTTP.FORBIDDEN).json({
                    success: false,
                    message: MENSAJES.ROL_NO_PERMITIDO_PUBLICO
                });
            }

            const usuarioExistente = await UsuarioService.verificarExistencia(correo, cedula);
            if (usuarioExistente.existe) {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: usuarioExistente.mensaje
                });
            }

            const nuevoUsuario = await AuthService.registrarUsuario({
                nombre,
                cedula,
                telefono,
                correo,
                contraseña,
                rol: rolFinal,
                especialidad
            });

            await EmailService.enviarBienvenida(nuevoUsuario.correo, nuevoUsuario.nombre, rolFinal);

            await AuditoriaService.registrarCreacion('usuario', {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                correo: nuevoUsuario.correo,
                rol: rolFinal
            });

            return res.status(CODIGOS_HTTP.CREADO).json({
                success: true,
                message: `Usuario registrado exitosamente como ${rolFinal}`,
                data: {
                    id: nuevoUsuario.id,
                    nombre: nuevoUsuario.nombre,
                    correo: nuevoUsuario.correo,
                    rol: rolFinal
                }
            });
        } catch (error) {
            console.error('Error en registro:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_SERVIDOR,
                error: error.message
            });
        }
    }

    async login(req, res) {
        try {
            const { correo, contraseña } = req.body;

            if (!correo || !contraseña) {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: MENSAJES.CREDENCIALES_REQUERIDAS
                });
            }

            const resultadoLogin = await AuthService.autenticar(correo, contraseña);

            if (!resultadoLogin.exito) {
                return res.status(resultadoLogin.codigoEstado).json({
                    success: false,
                    message: resultadoLogin.mensaje
                });
            }

            const { usuario, rol, rolData } = resultadoLogin;

            const tokens = TokenService.generarTokens({
                id: usuario.id,
                correo: usuario.correo,
                nombre: usuario.nombre,
                rol,
                rolData
            });

            await AuditoriaService.registrarLogin(
                { id: usuario.id, nombre: usuario.nombre },
                rol
            );

            return res.json({
                success: true,
                message: `Login exitoso como ${rol}`,
                data: {
                    usuario: {
                        id: usuario.id,
                        nombre: usuario.nombre,
                        cedula: usuario.cedula,
                        telefono: usuario.telefono,
                        correo: usuario.correo,
                        rol,
                        rolData
                    },
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken
                }
            });
        } catch (error) {
            console.error('Error en login:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_SERVIDOR,
                error: error.message
            });
        }
    }

    async promoverAGerente(req, res) {
        try {
            const { id_usuario, id_empresa } = req.body;

            if (!id_usuario || !id_empresa) {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: MENSAJES.DATOS_REQUERIDOS_GERENTE
                });
            }

            const resultado = await AuthService.promoverAGerente(id_usuario, id_empresa, req.usuario);

            if (!resultado.exito) {
                return res.status(resultado.codigoEstado).json({
                    success: false,
                    message: resultado.mensaje
                });
            }

            try {
                const { usuario, empresa } = resultado.datos;

                await EmailService.enviarPromocionGerente(
                    usuario.correo,
                    usuario.nombre,
                    empresa.nombre
                );

                await NotificacionService.crearNotificacionPromocionGerente(
                    usuario,
                    empresa
                );

            } catch (errorNotificacion) {
                console.error('Error al enviar notificaciones de promoción a gerente:', errorNotificacion);
            }

            return res.json({
                success: true,
                message: resultado.mensaje,
                data: resultado.datos
            });
        } catch (error) {
            console.error('Error al promover a gerente:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_SERVIDOR,
                error: error.message
            });
        }
    }

    async crearOrganizador(req, res) {
        try {
            const { nombre, cedula, telefono, correo, contraseña, id_empresa } = req.body;

            const validacion = AuthValidator.validarCreacionOrganizador(req.body);
            if (!validacion.esValida) {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: validacion.mensaje
                });
            }

            const resultado = await AuthService.crearOrganizador({
                nombre,
                cedula,
                telefono,
                correo,
                contraseña,
                id_empresa
            }, req.usuario);

            if (!resultado.exito) {
                return res.status(resultado.codigoEstado).json({
                    success: false,
                    message: resultado.mensaje
                });
            }

            EmailService.enviarCreacionOrganizador(correo, nombre, resultado.datos.empresa.nombre, contraseña).catch(errorEmail => {
                console.error('Error al enviar email de bienvenida al organizador:', errorEmail);
            });

            await NotificacionService.crearNotificacionBienvenidaOrganizador(
                resultado.datos.usuario,
                resultado.datos.empresa
            );

            return res.status(CODIGOS_HTTP.CREADO).json({
                success: true,
                message: resultado.mensaje,
                data: resultado.datos
            });
        } catch (error) {
            console.error('Error al crear organizador:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_SERVIDOR,
                error: error.message
            });
        }
    }

    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(CODIGOS_HTTP.NO_AUTORIZADO).json({
                    success: false,
                    message: MENSAJES.REFRESH_TOKEN_REQUERIDO
                });
            }

            const resultado = await TokenService.refrescarToken(refreshToken);

            if (!resultado.exito) {
                return res.status(CODIGOS_HTTP.NO_AUTORIZADO).json({
                    success: false,
                    message: resultado.mensaje
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.TOKEN_RENOVADO,
                data: {
                    accessToken: resultado.accessToken
                }
            });
        } catch (error) {
            console.error('Error al refrescar token:', error);
            return res.status(CODIGOS_HTTP.NO_AUTORIZADO).json({
                success: false,
                message: MENSAJES.REFRESH_TOKEN_INVALIDO
            });
        }
    }

    async getProfile(req, res) {
        try {
            const usuario = await UsuarioService.buscarPorId(req.usuario.id);

            if (!usuario) {
                return res.status(CODIGOS_HTTP.NOT_FOUND).json({
                    success: false,
                    message: MENSAJES.USUARIO_NO_ENCONTRADO
                });
            }

            return res.json({
                success: true,
                data: {
                    usuario: {
                        ...usuario.toJSON(),
                        rol: req.usuario.rol,
                        rolData: req.usuario.rolData
                    }
                }
            });
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_SERVIDOR,
                error: error.message
            });
        }
    }

    async recuperarContrasena(req, res) {
        try {
            const { correo, contraseña } = req.body;

            const validacion = AuthValidator.validarRecuperacionContrasena(req.body);
            if (!validacion.esValida) {
                return res.status(CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: validacion.mensaje
                });
            }

            const resultado = await AuthService.recuperarContrasena(correo, contraseña);

            if (!resultado.exito) {
                return res.status(resultado.codigoEstado).json({
                    success: false,
                    message: resultado.mensaje
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.CONTRASENA_ACTUALIZADA
            });
        } catch (error) {
            console.error('Error en recuperación de contraseña:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_SERVIDOR,
                error: error.message
            });
        }
    }

    async crearUsuarioPorAdmin(req, res) {
        try {
            const validacion = AuthValidator.validarCreacionPorAdmin(req.body, req.usuario);
            if (!validacion.esValida) {
                return res.status(validacion.codigoEstado || CODIGOS_HTTP.BAD_REQUEST).json({
                    success: false,
                    message: validacion.mensaje
                });
            }

            const resultado = await AuthService.crearUsuarioPorAdmin(req.body, req.usuario);

            if (!resultado.exito) {
                return res.status(resultado.codigoEstado).json({
                    success: false,
                    message: resultado.mensaje
                });
            }

            return res.status(CODIGOS_HTTP.CREADO).json({
                success: true,
                message: resultado.mensaje,
                data: resultado.datos
            });
        } catch (error) {
            console.error('Error al crear usuario:', error);
            return res.status(CODIGOS_HTTP.ERROR_INTERNO).json({
                success: false,
                message: MENSAJES.ERROR_SERVIDOR,
                error: error.message
            });
        }
    }
}

module.exports = new AuthController();
