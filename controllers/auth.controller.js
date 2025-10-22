const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario, Administrador, Asistente, Ponente, AdministradorEmpresa, Empresa } = require('../models');
const EmailService = require('../services/emailService');

const SALT_ROUNDS = 10;
const ALLOWED_PUBLIC_ROLES = ['asistente', 'ponente'];
const ROLE_GERENTE = 1;
const ROLE_ORGANIZADOR = 0;
const STATUS_ACTIVE = 1;
const STATUS_INACTIVE = 0;

const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '24h'
    });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });
};

const findUserRole = async (usuarioId) => {
    const administrador = await Administrador.findOne({
        where: { id_usuario: usuarioId }
    });

    if (administrador) {
        return {
            rol: 'administrador',
            rolData: { id_administrador: administrador.id }
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
        const rol = adminEmpresa.es_Gerente === ROLE_GERENTE ? 'gerente' : 'organizador';
        return {
            rol,
            rolData: {
                id_admin_empresa: adminEmpresa.id,
                id_empresa: adminEmpresa.id_empresa,
                empresa: adminEmpresa.empresa
            }
        };
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
            rolData: { id_asistente: asistente.id_asistente }
        };
    }

    return { rol: null, rolData: null };
};

const validateRequiredFields = (fields, fieldNames) => {
    return fieldNames.every(name => fields[name]);
};

const isEmailTaken = async (correo) => {
    const usuario = await Usuario.findOne({ where: { correo } });
    return !!usuario;
};

const isCedulaTaken = async (cedula) => {
    const usuario = await Usuario.findOne({ where: { cedula } });
    return !!usuario;
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
};

const createRoleRecord = async (usuarioId, rol, especialidad) => {
    if (rol === 'ponente') {
        return await Ponente.create({
            id_usuario: usuarioId,
            especialidad: especialidad || null
        });
    }

    return await Asistente.create({ id_usuario: usuarioId });
};

const sendWelcomeEmail = async (correo, nombre, rol) => {
    try {
        await EmailService.enviarBienvenida(correo, nombre, rol);
    } catch (error) {
        console.error('Error enviando correo de bienvenida:', error);
    }
};

const register = async (req, res) => {
    try {
        const { nombre, cedula, telefono, correo, contraseña, rol, especialidad } = req.body;

        if (!validateRequiredFields(req.body, ['nombre', 'cedula', 'correo', 'contraseña'])) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser proporcionados'
            });
        }

        const rolFinal = rol || 'asistente';

        if (!ALLOWED_PUBLIC_ROLES.includes(rolFinal)) {
            return res.status(403).json({
                success: false,
                message: 'Solo puede registrarse como asistente o ponente. Para otros roles contacte con un administrador.'
            });
        }

        if (await isEmailTaken(correo)) {
            return res.status(400).json({
                success: false,
                message: 'El correo ya está registrado'
            });
        }

        if (await isCedulaTaken(cedula)) {
            return res.status(400).json({
                success: false,
                message: 'La cédula ya está registrada'
            });
        }

        const contraseñaHash = await hashPassword(contraseña);

        const nuevoUsuario = await Usuario.create({
            nombre,
            cedula,
            telefono,
            correo,
            contraseña: contraseñaHash,
            activo: STATUS_ACTIVE
        });

        await createRoleRecord(nuevoUsuario.id, rolFinal, especialidad);
        await sendWelcomeEmail(nuevoUsuario.correo, nuevoUsuario.nombre, rolFinal);

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

const validateCredentials = async (correo, contraseña, usuario) => {
    if (!usuario) {
        return { valid: false, message: 'Credenciales inválidas' };
    }

    if (usuario.activo === STATUS_INACTIVE) {
        return { valid: false, message: 'Tu cuenta ha sido desactivada. Contacta al administrador.' };
    }

    const isPasswordValid = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!isPasswordValid) {
        return { valid: false, message: 'Credenciales inválidas' };
    }

    return { valid: true };
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

        const validation = await validateCredentials(correo, contraseña, usuario);
        if (!validation.valid) {
            return res.status(401).json({
                success: false,
                message: validation.message
            });
        }

        const { rol, rolData } = await findUserRole(usuario.id);

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
            rol,
            rolData
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ id: usuario.id, correo: usuario.correo });

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
                    rol,
                    rolData
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

        const asistente = await Asistente.findOne({ where: { id_usuario } });
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

        await AdministradorEmpresa.create({
            id_usuario,
            id_empresa,
            es_Gerente: ROLE_GERENTE
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

const validateGerentePermissions = (usuarioRol, usuarioEmpresaId, empresaId) => {
    if (usuarioRol === 'gerente' && usuarioEmpresaId !== empresaId) {
        return false;
    }
    return true;
};

const crearOrganizador = async (req, res) => {
    try {
        const { nombre, cedula, telefono, correo, contraseña, id_empresa } = req.body;

        if (!validateRequiredFields(req.body, ['nombre', 'cedula', 'correo', 'contraseña', 'id_empresa'])) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios para crear un organizador'
            });
        }

        if (!validateGerentePermissions(req.usuario.rol, req.usuario.rolData.id_empresa, id_empresa)) {
            return res.status(403).json({
                success: false,
                message: 'Solo puede crear organizadores para su propia empresa'
            });
        }

        const empresa = await Empresa.findByPk(id_empresa);
        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        if (await isEmailTaken(correo)) {
            return res.status(400).json({
                success: false,
                message: 'El correo ya está registrado'
            });
        }

        if (await isCedulaTaken(cedula)) {
            return res.status(400).json({
                success: false,
                message: 'La cédula ya está registrada'
            });
        }

        const contraseñaHash = await hashPassword(contraseña);

        const nuevoUsuario = await Usuario.create({
            nombre,
            cedula,
            telefono,
            correo,
            contraseña: contraseñaHash,
            activo: STATUS_ACTIVE
        });

        await AdministradorEmpresa.create({
            id_usuario: nuevoUsuario.id,
            id_empresa,
            es_Gerente: ROLE_ORGANIZADOR
        });

        try {
            await EmailService.enviarCreacionOrganizador(
                nuevoUsuario.correo,
                nuevoUsuario.nombre,
                empresa.nombre,
                contraseña
            );
        } catch (emailError) {
            console.error('Error enviando correo de creación:', emailError);
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

        if (usuario.activo === STATUS_INACTIVE) {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta ha sido desactivada'
            });
        }

        const { rol, rolData } = await findUserRole(usuario.id);

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
            rol,
            rolData
        };

        const newAccessToken = generateAccessToken(tokenPayload);

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

        const contraseñaHash = await hashPassword(contraseña);
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
