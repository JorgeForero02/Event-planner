const { Lugar, Ubicacion, Empresa, LugarActividad } = require('../models');
const { MENSAJES } = require('../constants/lugar.constants');

class LugarService {
    crearTransaccion() {
        return Lugar.sequelize.transaction();
    }

    async crear(datosLugar, transaction) {
        const [empresa, ubicacion] = await Promise.all([
            Empresa.findByPk(datosLugar.id_empresa),
            Ubicacion.findOne({
                where: {
                    id: datosLugar.id_ubicacion,
                    id_empresa: datosLugar.id_empresa
                }
            })
        ]);

        const lugar = await Lugar.create(datosLugar, { transaction });

        return {
            lugar,
            empresa,
            ubicacion
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

        const lugares = await Lugar.findAll({
            where: { id_empresa: empresaId },
            include: [{
                model: Ubicacion,
                as: 'ubicacion',
                attributes: ['id', 'direccion', 'lugar', 'capacidad']
            }],
            order: [['nombre', 'ASC']]
        });

        return {
            exito: true,
            lugares
        };
    }

    async buscarPorId(lugarId, transaction = null) {
        return await Lugar.findByPk(lugarId, {
            include: [
                {
                    model: Ubicacion,
                    as: 'ubicacion',
                    attributes: ['id', 'direccion', 'lugar', 'capacidad', 'id_empresa']
                },
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['id', 'nombre']
                }
            ],
            ...(transaction && { transaction })
        });
    }

    construirActualizaciones({ nombre, descripcion }) {
        const actualizaciones = {};
        if (nombre !== undefined) actualizaciones.nombre = nombre;
        if (descripcion !== undefined) actualizaciones.descripcion = descripcion;
        return actualizaciones;
    }

    async verificarActividadesAsociadas(lugarId, transaction) {
        const lugarEnActividades = await LugarActividad.findOne({
            where: { id_lugar: lugarId },
            transaction
        });

        return !!lugarEnActividades;
    }
}

module.exports = new LugarService();
