// controllers/userManagement.controller.js
const { Usuario, Administrador, Asistente, Ponente, AdministradorEmpresa, Empresa } = require('../models');
const bcrypt = require('bcryptjs');
const ApiResponse = require('../utils/response');

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

            const rol = await determinarRolCompleto(id);

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
                const cedulaExiste = await Usuario.findOne({
                    where: { cedula }
                });

                if (cedulaExiste) {
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

            switch (rol) {
                case 'ponente':
                    const ponente = await Ponente.findOne({ where: { id_usuario: id } });
                    if (ponente) {
                        updated = await ponente.update({ especialidad: roleData.especialidad });
                    }
                    break;

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

            await adminEmpresa.update({ id_empresa: nueva_empresa_id });

            return ApiResponse.success(res, {
                usuario_id: id,
                empresa_anterior: adminEmpresa.id_empresa,
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

            if (!nombre || !cedula || !correo || !contraseña || !rol) {
                return ApiResponse.error(res, 'Faltan campos obligatorios', 400);
            }

            const correoExiste = await Usuario.findOne({ where: { correo } });
            if (correoExiste) {
                return ApiResponse.error(res, 'El correo ya está registrado', 400);
            }

            const cedulaExiste = await Usuario.findOne({ where: { cedula } });
            if (cedulaExiste) {
                return ApiResponse.error(res, 'La cédula ya está registrada', 400);
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

            let rolCreado = await crearRolAsociado(nuevoUsuario.id, rol, roleData);

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
                    const rol = await determinarRolCompleto(usuario.id);
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

            const esValida = await bcrypt.compare(contraseña_actual, usuario.contraseña);
            if (!esValida) {
                return ApiResponse.error(res, 'Contraseña actual incorrecta', 401);
            }

            const salt = await bcrypt.genSalt(10);
            const nuevaContraseñaHash = await bcrypt.hash(contraseña_nueva, salt);

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

            // Actualizar estado
            await usuario.update({ activo });

            const mensaje = activo === 1
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

async function determinarRolCompleto(usuarioId) {
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
        return {
            rol: adminEmpresa.es_Gerente === 1 ? 'gerente' : 'organizador',
            rol_id: adminEmpresa.id,
            rol_data: {
                empresa_id: adminEmpresa.id_empresa,
                empresa_nombre: adminEmpresa.empresa?.nombre,
                es_gerente: adminEmpresa.es_Gerente === 1
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
}

async function crearRolAsociado(usuarioId, rol, roleData) {
    switch (rol) {
        case 'administrador':
            return await Administrador.create({ id_usuario: usuarioId });

        case 'ponente':
            return await Ponente.create({
                id_usuario: usuarioId,
                especialidad: roleData?.especialidad || null
            });

        case 'asistente':
            return await Asistente.create({ id_usuario: usuarioId });

        case 'organizador':
            return await AdministradorEmpresa.create({
                id_usuario: usuarioId,
                id_empresa: roleData.empresa_id,
                es_Gerente: 0
            });

        case 'gerente':
            return await AdministradorEmpresa.create({
                id_usuario: usuarioId,
                id_empresa: roleData.empresa_id,
                es_Gerente: 1
            });

        default:
            throw new Error('Rol no válido');
    }
}

module.exports = UserManagementController;
