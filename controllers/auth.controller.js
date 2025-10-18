const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario, Administrador, Asistente, Ponente, AdministradorEmpresa, Empresa } = require('../models');
const EmailService = require('../services/emailService');

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

// REGISTRO PÚBLICO - Solo Asistente y Ponente
const register = async (req, res) => {
    try {
        const { nombre, cedula, telefono, correo, contraseña, rol, especialidad } = req.body;

        if (!nombre || !cedula || !correo || !contraseña) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser proporcionados'
            });
        }

        const rolesPermitidos = ['asistente', 'ponente'];
        const rolFinal = rol || 'asistente'; 

        if (!rolesPermitidos.includes(rolFinal)) {
            return res.status(403).json({
                success: false,
                message: 'Solo puede registrarse como asistente o ponente. Para otros roles contacte con un administrador.'
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
            contraseña: contraseñaHash,
            activo: 1
        });

        let rolCreado = null;
        if (rolFinal === 'ponente') {
            rolCreado = await Ponente.create({
                id_usuario: nuevoUsuario.id,
                especialidad: especialidad || null
            });
        } else {
            rolCreado = await Asistente.create({
                id_usuario: nuevoUsuario.id
            });
        }

        try {
            await EmailService.enviarBienvenida(nuevoUsuario.correo, nuevoUsuario.nombre, rolFinal);
        } catch (emailError) {
            console.error('Error enviando correo de bienvenida:', emailError);
        }

        res.status(201).json({
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
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
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
            attributes: ['id', 'nombre', 'cedula', 'telefono', 'correo', 'contraseña', 'activo']
        });

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        if (usuario.activo === 0) {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
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

// PROMOVER ASISTENTE A GERENTE (Solo Administrador del Sistema)
const promoverAGerente = async (req, res) => {
    try {
        const { id_usuario, id_empresa } = req.body;

        if (!id_usuario || !id_empresa) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere id_usuario e id_empresa'
            });
        }

        const usuario = await Usuario.findByPk(id_usuario);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const asistente = await Asistente.findOne({
            where: { id_usuario }
        });

        if (!asistente) {
            return res.status(400).json({
                success: false,
                message: 'El usuario no es un asistente. Solo se puede promover asistentes a gerente.'
            });
        }

        const empresa = await Empresa.findByPk(id_empresa);

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        const nuevoGerente = await AdministradorEmpresa.create({
            id_usuario,
            id_empresa,
            es_Gerente: 1
        });

        try {
            await EmailService.enviarPromocionGerente(usuario.correo, usuario.nombre, empresa.nombre);
        } catch (emailError) {
            console.error('Error enviando correo de promoción:', emailError);
        }

        res.json({
            success: true,
            message: `Usuario ${usuario.nombre} promovido a gerente de ${empresa.nombre}`,
            data: {
                id_usuario: usuario.id,
                nombre: usuario.nombre,
                rol_anterior: 'asistente',
                rol_nuevo: 'gerente',
                empresa: {
                    id: empresa.id,
                    nombre: empresa.nombre
                }
            }
        });
    } catch (error) {
        console.error('Error al promover a gerente:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
};

// CREAR ORGANIZADOR (Solo Gerente o Administrador)
const crearOrganizador = async (req, res) => {
    try {
        const { nombre, cedula, telefono, correo, contraseña, id_empresa } = req.body;

        if (!nombre || !cedula || !correo || !contraseña || !id_empresa) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios para crear un organizador'
            });
        }

        if (req.usuario.rol === 'gerente') {
            if (req.usuario.rolData.id_empresa !== id_empresa) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo puede crear organizadores para su propia empresa'
                });
            }
        }

        const empresa = await Empresa.findByPk(id_empresa);

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
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

        const contraseñaTemporal = contraseña;

        const salt = await bcrypt.genSalt(10);
        const contraseñaHash = await bcrypt.hash(contraseña, salt);

        const nuevoUsuario = await Usuario.create({
            nombre,
            cedula,
            telefono,
            correo,
            contraseña: contraseñaHash,
            activo: 1
        });

        const nuevoOrganizador = await AdministradorEmpresa.create({
            id_usuario: nuevoUsuario.id,
            id_empresa,
            es_Gerente: 0
        });

        // ENVIAR CORREO CON CREDENCIALES
        try {
            await EmailService.enviarCreacionOrganizador(
                nuevoUsuario.correo,
                nuevoUsuario.nombre,
                empresa.nombre,
                contraseñaTemporal
            );
        } catch (emailError) {
            console.error('Error enviando correo de creación:', emailError);
            // No fallar la creación si el correo falla
        }

        res.status(201).json({
            success: true,
            message: `Organizador creado exitosamente para ${empresa.nombre}`,
            data: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                correo: nuevoUsuario.correo,
                rol: 'organizador',
                empresa: {
                    id: empresa.id,
                    nombre: empresa.nombre
                },
                creado_por: req.usuario.nombre
            }
        });
    } catch (error) {
        console.error('Error al crear organizador:', error);
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

        // VALIDAR QUE EL USUARIO ESTÉ ACTIVO
        if (usuario.activo === 0) {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta ha sido desactivada'
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
            attributes: ['id', 'nombre', 'cedula', 'telefono', 'correo', 'activo']
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

// recuperar contraseña
const recuperarContrasena = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        if (!correo || !contraseña) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporcione correo y nueva contraseña'
            });
        }

        const usuario = await Usuario.findOne({ where: { correo } });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const contraseñaHash = await bcrypt.hash(contraseña, salt);

        await Usuario.update({ contraseña: contraseñaHash }, { where: { correo } });

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error en recuperación de contraseña:', error);
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
    promoverAGerente,
    crearOrganizador,
    refresh,
    getProfile,
    recuperarContrasena
};
