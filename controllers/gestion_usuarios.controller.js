const { Usuario, Administrador, Asistente, Ponente, AdministradorEmpresa, Empresa } = require('../models');
const bcrypt = require('bcryptjs');
const ApiResponse = require('../utils/response');

const SALT_ROUNDS = 10;
const STATUS_ACTIVE = 1;

const findCompleteUserRole = async (usuarioId) => {
    const administrador = await Administrador.findOne({
        where: { id_usuario: usuarioId }
    });

    if (administrador) {
        return {
            rol: 'administrador',
            rol_id: administrador.id,
            rol_data: null
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
        const isGerente = adminEmpresa.es_Gerente === 1;
        return {
            rol: isGerente ? 'gerente' : 'organizador',
            rol_id: adminEmpresa.id,
            rol_data: {
                empresa_id: adminEmpresa.id_empresa,
                empresa_nombre: adminEmpresa.empresa?.nombre,
                es_gerente: isGerente
            }
        };
    }

    const ponente = await Ponente.findOne({
        where: { id_usuario: usuarioId }
    });

    if (ponente) {
        return {
            rol: 'ponente',
            rol_id: ponente.id_ponente,
            rol_data: {
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
            rol_id: asistente.id_asistente,
            rol_data: null
        };
    }

    return {
        rol: null,
        rol_id: null,
        rol_data: null
    };
};

const createUserRole = async (usuarioId, rol, roleData) => {
    const roleCreators = {
        administrador: () => Administrador.create({ id_usuario: usuarioId }),
        ponente: () => Ponente.create({
            id_usuario: usuarioId,
            especialidad: roleData?.especialidad || null
        }),
        asistente: () => Asistente.create({ id_usuario: usuarioId }),
        organizador: () => AdministradorEmpresa.create({
            id_usuario: usuarioId,
            id_empresa: roleData.empresa_id,
            es_Gerente: 0
        }),
        gerente: () => AdministradorEmpresa.create({
            id_usuario: usuarioId,
            id_empresa: roleData.empresa_id,
            es_Gerente: 1
        })
    };

    const creator = roleCreators[rol];
    if (!creator) {
        throw new Error('Rol no válido');
    }

    return await creator();
};

const isCedulaAvailable = async (cedula, excludeUserId = null) => {
    const where = { cedula };
    const existingUser = await Usuario.findOne({ where });

    if (!existingUser) return true;
    if (excludeUserId && existingUser.id === excludeUserId) return true;

    return false;
};

const isEmailAvailable = async (correo) => {
    const existingUser = await Usuario.findOne({ where: { correo } });
    return !existingUser;
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
};

const validateRequiredFields = (fields, required) => {
    return required.every(field => fields[field]);
};

const UserManagementController = {
    getUserComplete: async (req, res, next) => {
        try {
            const { id } = req.params;

            const usuario = await Usuario.findByPk(id, {
                attributes: ['id', 'nombre', 'cedula', 'telefono', 'correo']
            });

            if (!usuario) {
                return ApiResponse.notFound(res, 'Usuario no encontrado');
            }

            const rol = await findCompleteUserRole(id);

            return ApiResponse.success(res, {
                ...usuario.toJSON(),
                ...rol
            }, 'Usuario obtenido correctamente');
        } catch (error) {
            next(error);
        }
    },

    updateProfile: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { nombre, telefono, cedula } = req.body;

            const usuario = await Usuario.findByPk(id);

            if (!usuario) {
                return ApiResponse.notFound(res, 'Usuario no encontrado');
            }

            if (cedula && cedula !== usuario.cedula) {
                const isAvailable = await isCedulaAvailable(cedula, parseInt(id));

                if (!isAvailable) {
                    return ApiResponse.error(res, 'La cédula ya está registrada', 400);
                }
            }

            await usuario.update({ nombre, telefono, cedula });

            return ApiResponse.success(res, usuario, 'Perfil actualizado correctamente');
        } catch (error) {
            next(error);
        }
    },

    updateRoleData: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { rol, roleData } = req.body;

            let updated = null;

            if (rol === 'ponente') {
                const ponente = await Ponente.findOne({ where: { id_usuario: id } });
                if (ponente) {
                    updated = await ponente.update({ especialidad: roleData.especialidad });
                }
            }

            if (!updated) {
                return ApiResponse.notFound(res, 'Rol no encontrado para este usuario');
            }

            return ApiResponse.success(res, updated, 'Datos de rol actualizados');
        } catch (error) {
            next(error);
        }
    },

    changeCompany: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { nueva_empresa_id } = req.body;

            const empresa = await Empresa.findByPk(nueva_empresa_id);

            if (!empresa) {
                return ApiResponse.notFound(res, 'Empresa no encontrada');
            }

            const adminEmpresa = await AdministradorEmpresa.findOne({
                where: { id_usuario: id }
            });

            if (!adminEmpresa) {
                return ApiResponse.notFound(res, 'Usuario no tiene empresa asignada');
            }

            const empresaAnterior = adminEmpresa.id_empresa;
            await adminEmpresa.update({ id_empresa: nueva_empresa_id });

            return ApiResponse.success(res, {
                usuario_id: id,
                empresa_anterior: empresaAnterior,
                empresa_nueva: nueva_empresa_id,
                empresa_nombre: empresa.nombre
            }, 'Empresa actualizada correctamente');
        } catch (error) {
            next(error);
        }
    },

    createUser: async (req, res, next) => {
        try {
            const { nombre, cedula, telefono, correo, contraseña, rol, roleData } = req.body;

            const requiredFields = ['nombre', 'cedula', 'correo', 'contraseña', 'rol'];
            if (!validateRequiredFields(req.body, requiredFields)) {
                return ApiResponse.error(res, 'Faltan campos obligatorios', 400);
            }

            if (!(await isEmailAvailable(correo))) {
                return ApiResponse.error(res, 'El correo ya está registrado', 400);
            }

            if (!(await isCedulaAvailable(cedula))) {
                return ApiResponse.error(res, 'La cédula ya está registrada', 400);
            }

            const contraseñaHash = await hashPassword(contraseña);

            const nuevoUsuario = await Usuario.create({
                nombre,
                cedula,
                telefono,
                correo,
                contraseña: contraseñaHash
            });

            const rolCreado = await createUserRole(nuevoUsuario.id, rol, roleData);

            return ApiResponse.success(res, {
                usuario: nuevoUsuario,
                rol: rolCreado
            }, 'Usuario creado exitosamente', 201);
        } catch (error) {
            next(error);
        }
    },

    getAllUsersComplete: async (req, res, next) => {
        try {
            const usuarios = await Usuario.findAll({
                attributes: ['id', 'nombre', 'cedula', 'telefono', 'correo']
            });

            const usuariosCompletos = await Promise.all(
                usuarios.map(async (usuario) => {
                    const rol = await findCompleteUserRole(usuario.id);
                    return {
                        ...usuario.toJSON(),
                        ...rol
                    };
                })
            );

            return ApiResponse.success(res, usuariosCompletos, 'Usuarios obtenidos correctamente');
        } catch (error) {
            next(error);
        }
    },

    changePassword: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { contraseña_actual, contraseña_nueva } = req.body;

            const usuario = await Usuario.findByPk(id, {
                attributes: ['id', 'contraseña']
            });

            if (!usuario) {
                return ApiResponse.notFound(res, 'Usuario no encontrado');
            }

            const isPasswordValid = await bcrypt.compare(contraseña_actual, usuario.contraseña);

            if (!isPasswordValid) {
                return ApiResponse.error(res, 'Contraseña actual incorrecta', 401);
            }

            const nuevaContraseñaHash = await hashPassword(contraseña_nueva);
            await usuario.update({ contraseña: nuevaContraseñaHash });

            return ApiResponse.success(res, null, 'Contraseña actualizada exitosamente');
        } catch (error) {
            next(error);
        }
    },

    toggleUserStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { activo } = req.body;

            if (req.usuario.id === parseInt(id)) {
                return ApiResponse.error(res, 'No puedes desactivar tu propia cuenta', 400);
            }

            const usuario = await Usuario.findByPk(id, {
                attributes: ['id', 'nombre', 'correo', 'activo']
            });

            if (!usuario) {
                return ApiResponse.notFound(res, 'Usuario no encontrado');
            }

            await usuario.update({ activo });

            const mensaje = activo === STATUS_ACTIVE
                ? `Usuario ${usuario.nombre} activado exitosamente`
                : `Usuario ${usuario.nombre} desactivado exitosamente`;

            return ApiResponse.success(res, {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                activo: usuario.activo,
                modificado_por: req.usuario.nombre
            }, mensaje);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = UserManagementController;
