const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario, Administrador, Asistente, Ponente, AdministradorEmpresa, Empresa } = require('../models');

const generarToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '24h'
    });
};

const generarRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });
};

const determinarRol = async (usuarioId) => {
    const administrador = await Administrador.findOne({
        where: { id_usuario: usuarioId }
    });

    if (administrador) {
        return {
            rol: 'administrador',
            rolData: {
                id_administrador: administrador.id
            }
        };
    }

    const adminEmpresa = await AdministradorEmpresa.findOne({
        where: { id_usuario: usuarioId },
        include: [{
            model: Empresa,
            as: 'empresa',
            attributes: ['id', 'nombre']
        }]
    });

    if (adminEmpresa) {
        if (adminEmpresa.es_Gerente === 1) {
            return {
                rol: 'gerente',
                rolData: {
                    id_admin_empresa: adminEmpresa.id,
                    id_empresa: adminEmpresa.id_empresa,
                    empresa: adminEmpresa.empresa
                }
            };
        } else {
            return {
                rol: 'organizador',
                rolData: {
                    id_admin_empresa: adminEmpresa.id,
                    id_empresa: adminEmpresa.id_empresa,
                    empresa: adminEmpresa.empresa
                }
            };
        }
    }

    const ponente = await Ponente.findOne({
        where: { id_usuario: usuarioId }
    });

    if (ponente) {
        return {
            rol: 'ponente',
            rolData: {
                id_ponente: ponente.id_ponente,
                especialidad: ponente.especialidad
            }
        };
    }

    const asistente = await Asistente.findOne({
        where: { id_usuario: usuarioId }
    });

    if (asistente) {
        return {
            rol: 'asistente',
            rolData: {
                id_asistente: asistente.id_asistente
            }
        };
    }

    return {
        rol: null,
        rolData: null
    };
};

const login = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        if (!correo || !contraseña) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporcione correo y contraseña'
            });
        }

        const usuario = await Usuario.findOne({
            where: { correo },
            attributes: ['id', 'nombre', 'cedula', 'telefono', 'correo', 'contraseña']
        });

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);

        if (!contraseñaValida) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const { rol, rolData } = await determinarRol(usuario.id);

        if (!rol) {
            return res.status(403).json({
                success: false,
                message: 'Usuario sin rol asignado. Contacte al administrador.'
            });
        }

        const tokenPayload = {
            id: usuario.id,
            correo: usuario.correo,
            nombre: usuario.nombre,
            rol: rol,
            rolData: rolData
        };

        const accessToken = generarToken(tokenPayload);
        const refreshToken = generarRefreshToken({ id: usuario.id, correo: usuario.correo });

        res.json({
            success: true,
            message: `Login exitoso como ${rol}`,
            data: {
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    cedula: usuario.cedula,
                    telefono: usuario.telefono,
                    correo: usuario.correo,
                    rol: rol,
                    rolData: rolData
                },
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
};

const register = async (req, res) => {
    try {
        const { nombre, cedula, telefono, correo, contraseña, rol, id_empresa, es_Gerente, especialidad } = req.body;

        if (!nombre || !cedula || !correo || !contraseña || !rol) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser proporcionados'
            });
        }

        const rolesValidos = ['administrador', 'gerente', 'organizador', 'ponente', 'asistente'];
        if (!rolesValidos.includes(rol)) {
            return res.status(400).json({
                success: false,
                message: `Rol inválido. Roles permitidos: ${rolesValidos.join(', ')}`
            });
        }

        if ((rol === 'gerente' || rol === 'organizador') && !id_empresa) {
            return res.status(400).json({
                success: false,
                message: 'El campo id_empresa es obligatorio para gerentes y organizadores'
            });
        }

        const usuarioExistente = await Usuario.findOne({
            where: { correo }
        });

        if (usuarioExistente) {
            return res.status(400).json({
                success: false,
                message: 'El correo ya está registrado'
            });
        }

        const cedulaExistente = await Usuario.findOne({
            where: { cedula }
        });

        if (cedulaExistente) {
            return res.status(400).json({
                success: false,
                message: 'La cédula ya está registrada'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const contraseñaHash = await bcrypt.hash(contraseña, salt);

        const nuevoUsuario = await Usuario.create({
            nombre,
            cedula,
            telefono,
            correo,
            contraseña: contraseñaHash
        });

        let rolCreado = null;

        switch (rol) {
            case 'administrador':
                rolCreado = await Administrador.create({
                    id_usuario: nuevoUsuario.id
                });
                break;

            case 'gerente':
                rolCreado = await AdministradorEmpresa.create({
                    id_usuario: nuevoUsuario.id,
                    id_empresa: id_empresa,
                    es_Gerente: 1
                });
                break;

            case 'organizador':
                rolCreado = await AdministradorEmpresa.create({
                    id_usuario: nuevoUsuario.id,
                    id_empresa: id_empresa,
                    es_Gerente: 0
                });
                break;

            case 'ponente':
                rolCreado = await Ponente.create({
                    id_usuario: nuevoUsuario.id,
                    especialidad: especialidad || null
                });
                break;

            case 'asistente':
                rolCreado = await Asistente.create({
                    id_usuario: nuevoUsuario.id
                });
                break;
        }

        res.status(201).json({
            success: true,
            message: `Usuario registrado exitosamente como ${rol}`,
            data: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                correo: nuevoUsuario.correo,
                rol: rol
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
};

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'No se proporcionó refresh token'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const usuario = await Usuario.findByPk(decoded.id);

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const { rol, rolData } = await determinarRol(usuario.id);

        if (!rol) {
            return res.status(403).json({
                success: false,
                message: 'Usuario sin rol asignado'
            });
        }

        const tokenPayload = {
            id: usuario.id,
            correo: usuario.correo,
            nombre: usuario.nombre,
            rol: rol,
            rolData: rolData
        };

        const newAccessToken = generarToken(tokenPayload);

        res.json({
            success: true,
            message: 'Token renovado exitosamente',
            data: {
                accessToken: newAccessToken
            }
        });

    } catch (error) {
        console.error('Error al refrescar token:', error);
        res.status(401).json({
            success: false,
            message: 'Refresh token inválido o expirado'
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.usuario.id, {
            attributes: ['id', 'nombre', 'cedula', 'telefono', 'correo']
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
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
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
};

module.exports = {
    login,
    register,
    refresh,
    getProfile
};
