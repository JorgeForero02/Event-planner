const { Ubicacion, Ciudad, Empresa } = require('../models');
const { MENSAJES } = require('../constants/ubicacion.constants');

class UbicacionService {
    crearTransaccion() {
        return Ubicacion.sequelize.transaction();
    }

    async crear(datosUbicacion, transaction) {
        const [empresa, ciudad] = await Promise.all([
            Empresa.findByPk(datosUbicacion.id_empresa),
            Ciudad.findByPk(datosUbicacion.id_ciudad)
        ]);

        const ubicacion = await Ubicacion.create(datosUbicacion, { transaction });
        return {
            ubicacion,
            empresa,
            ciudad
        };
    }

    async obtenerPorEmpresa(empresaId) {
        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            return {
                exito: false,
                mensaje: MENSAJES.EMPRESA_NO_ENCONTRADA
            };
        }

        const ubicaciones = await Ubicacion.findAll({
            where: { id_empresa: empresaId },
            include: [{
                model: Ciudad,
                as: 'ciudad',
                attributes: ['id', 'nombre']
            }],
            order: [['direccion', 'ASC']]
        });

        return {
            exito: true,
            ubicaciones
        };
    }

    async buscarPorId(ubicacionId, transaction = null) {
        return await Ubicacion.findByPk(ubicacionId, {
            include: [
                { model: Ciudad, as: 'ciudad', attributes: ['id', 'nombre'] },
                { model: Empresa, as: 'empresa', attributes: ['id', 'nombre'] }
            ],
            ...(transaction && { transaction })
        });
    }

    construirActualizaciones({ lugar, direccion, descripcion }) {
        const actualizaciones = {};
        if (lugar !== undefined) actualizaciones.lugar = lugar;
        if (direccion !== undefined) actualizaciones.direccion = direccion;
        if (descripcion !== undefined) actualizaciones.descripcion = descripcion;
        return actualizaciones;
    }
}

module.exports = new UbicacionService();
