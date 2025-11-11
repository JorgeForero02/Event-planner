const { Empresa, Ciudad } = require('../models');
const { MENSAJES_VALIDACION } = require('../constants/ubicacion.constants');

class UbicacionValidator {
    async validarCreacion({ direccion, capacidad, id_ciudad, empresaId }) {
        if (!direccion || direccion.trim().length < 3) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.DIRECCION_REQUERIDA
            };
        }

        if (!id_ciudad) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.CIUDAD_REQUERIDA
            };
        }

        if (capacidad !== undefined && (capacidad === null || parseInt(capacidad) < 1)) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.CAPACIDAD_INVALIDA
            };
        }

        const empresa = await Empresa.findByPk(empresaId);

        if (!empresa) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.EMPRESA_NO_ENCONTRADA,
                codigoEstado: 404
            };
        }

        const ciudad = await Ciudad.findByPk(id_ciudad);

        if (!ciudad) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.CIUDAD_NO_ENCONTRADA,
                codigoEstado: 404
            };
        }

        return { esValida: true };
    }

    validarActualizacion({ capacidad }) {
        if (capacidad !== undefined && (capacidad === null || parseInt(capacidad) < 1)) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.CAPACIDAD_INVALIDA
            };
        }

        return { esValida: true };
    }
}

module.exports = new UbicacionValidator();
