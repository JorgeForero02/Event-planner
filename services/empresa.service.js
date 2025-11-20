const { Empresa, Usuario, AdministradorEmpresa } = require('../models');
const { MENSAJES, ESTADOS, ROLES } = require('../constants/empresa.constants');

class EmpresaService {
    async obtenerPorRol(rol, rolData, incluirPendientes) {
        const whereClause = this._construirWhereClause(rol, incluirPendientes);

        if (rol === 'administrador') {
            return await Empresa.findAll({
                where: whereClause,
                order: [['id', 'ASC']]
            });
        }

        if (rol === 'gerente' || rol === 'organizador') {
            return await Empresa.findAll({
                where: {
                    id: rolData.id_empresa,
                    ...whereClause
                },
                order: [['id', 'ASC']]
            });
        }

        return [];
    }

    async buscarPorId(id) {
        return await Empresa.findByPk(id);
    }

    async crear(datos, rol, usuarioId) {
        const estado = rol === 'asistente' ? ESTADOS.PENDIENTE : ESTADOS.ACTIVO;

        const empresaData = {
            ...datos,
            estado,
            ...(rol === 'asistente' && { id_creador: usuarioId })
        };

        const empresa = await Empresa.create(empresaData);

        let usuario = null;
        if (rol === 'asistente') {
            usuario = await Usuario.findByPk(usuarioId);
        }

        const mensaje = rol === 'asistente'
            ? MENSAJES.CREADA_PENDIENTE
            : MENSAJES.CREADA;

        return { empresa, usuario, mensaje };
    }

    async actualizar(id, datos) {
        const empresa = await this.buscarPorId(id);

        if (!empresa) {
            return {
                exito: false,
                mensaje: MENSAJES.NO_ENCONTRADA
            };
        }

        const datosAnteriores = { ...empresa.toJSON() };
        await empresa.update(datos);

        return {
            exito: true,
            empresa,
            datosAnteriores,
            datosNuevos: empresa.toJSON()
        };
    }

    async eliminar(id) {
        const empresa = await this.buscarPorId(id);

        if (!empresa) {
            return {
                exito: false,
                mensaje: MENSAJES.NO_ENCONTRADA
            };
        }

        await empresa.destroy();

        return { exito: true };
    }

    async obtenerEquipo(empresaId) {
        const equipo = await AdministradorEmpresa.findAll({
            where: { id_empresa: empresaId },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'cedula', 'telefono', 'correo']
            }],
            order: [['es_Gerente', 'DESC'], ['id', 'ASC']]
        });

        return equipo.map(miembro => ({
            id: miembro.id,
            usuario: miembro.usuario,
            rol: miembro.es_Gerente === ROLES.GERENTE ? 'gerente' : 'organizador'
        }));
    }

    async obtenerPendientes() {
        return await Empresa.findAll({
            where: { estado: ESTADOS.PENDIENTE },
            include: [{
                model: Usuario,
                as: 'creador',
                attributes: ['id', 'nombre', 'correo', 'telefono']
            }],
            order: [['id', 'DESC']]
        });
    }

    async procesarAprobacion(id, aprobar, motivo) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            return {
                exito: false,
                mensaje: MENSAJES.NO_ENCONTRADA,
                codigoEstado: 404
            };
        }

        if (empresa.estado !== ESTADOS.PENDIENTE) {
            return {
                exito: false,
                mensaje: MENSAJES.YA_PROCESADA,
                codigoEstado: 400
            };
        }

        const nuevoEstado = aprobar ? ESTADOS.ACTIVO : ESTADOS.RECHAZADO;
        await empresa.update({ estado: nuevoEstado });

        let creador = null;
        if (empresa.id_creador) {
            creador = await Usuario.findByPk(empresa.id_creador);
        }

        const mensaje = aprobar ? MENSAJES.APROBADA : MENSAJES.RECHAZADA;

        return {
            exito: true,
            empresa,
            creador,
            mensaje
        };
    }

    _construirWhereClause(rol, incluirPendientes) {
        if (rol === 'administrador') {
            return incluirPendientes === 'true' ? {} : { estado: ESTADOS.ACTIVO };
        }
        return { estado: ESTADOS.ACTIVO };
    }
}

module.exports = new EmpresaService();