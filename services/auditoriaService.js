const { Auditoria } = require('../models');

class AuditoriaService {
    static async registrar({ mensaje, tipo, accion, usuario = null }) {
        try {
            const ahora = new Date();

            const registroAuditoria = await Auditoria.create({
                fecha: ahora.toISOString().split('T')[0],
                hora: ahora.toTimeString().split(' ')[0],
                mensaje: usuario
                    ? `${mensaje} - Usuario: ${usuario.nombre} (ID: ${usuario.id})`
                    : mensaje,
                tipo: tipo,
                accion: accion
            });

            return registroAuditoria;
        } catch (error) {
            console.error('Error al registrar auditoría:', error);
            return null;
        }
    }

    static async registrarLogin(usuario, rol) {
        return await this.registrar({
            mensaje: `Login exitoso como ${rol}`,
            tipo: 'POST',
            accion: 'login',
            usuario
        });
    }

    static async registrarLogout(usuario) {
        return await this.registrar({
            mensaje: 'Usuario cerró sesión',
            tipo: 'POST',
            accion: 'logout',
            usuario
        });
    }

    static async registrarCreacion(entidad, datos, usuario = null) {
        return await this.registrar({
            mensaje: `Creación de ${entidad}: ${JSON.stringify(datos)}`,
            tipo: 'POST',
            accion: `crear_${entidad}`,
            usuario
        });
    }

    static async registrarActualizacion(entidad, id, datosAnteriores, datosNuevos, usuario = null) {
        const cambios = this.calcularCambios(datosAnteriores, datosNuevos);
        return await this.registrar({
            mensaje: `Actualización de ${entidad} ID ${id}. Cambios: ${JSON.stringify(cambios)}`,
            tipo: 'PUT',
            accion: `actualizar_${entidad}`,
            usuario
        });
    }

    static async registrarEliminacion(entidad, id, usuario = null) {
        return await this.registrar({
            mensaje: `Eliminación de ${entidad} con ID ${id}`,
            tipo: 'DELETE',
            accion: `eliminar_${entidad}`,
            usuario
        });
    }

    static async registrarConsulta(entidad, detalle, usuario = null) {
        return await this.registrar({
            mensaje: `Consulta de ${entidad}: ${detalle}`,
            tipo: 'GET',
            accion: `consultar_${entidad}`,
            usuario
        });
    }

    static calcularCambios(anterior, nuevo) {
        const cambios = {};
        const todasLasClaves = new Set([
            ...Object.keys(anterior || {}),
            ...Object.keys(nuevo || {})
        ]);

        todasLasClaves.forEach(clave => {
            if (anterior[clave] !== nuevo[clave]) {
                cambios[clave] = {
                    antes: anterior[clave],
                    despues: nuevo[clave]
                };
            }
        });

        return cambios;
    }

    static async obtenerRegistros(filtros = {}) {
        try {
            const where = {};

            if (filtros.tipo) where.tipo = filtros.tipo;
            if (filtros.accion) where.accion = filtros.accion;
            if (filtros.fechaInicio) where.fecha = { [Op.gte]: filtros.fechaInicio };
            if (filtros.fechaFin) where.fecha = { [Op.lte]: filtros.fechaFin };

            const registros = await Auditoria.findAll({
                where,
                order: [['fecha', 'DESC'], ['hora', 'DESC']],
                limit: filtros.limite || 100
            });

            return registros;
        } catch (error) {
            console.error('Error al obtener registros de auditoría:', error);
            throw error;
        }
    }
}

module.exports = AuditoriaService;
