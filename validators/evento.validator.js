const { Empresa } = require('../models');
const { MENSAJES_VALIDACION, ESTADOS, MODALIDADES } = require('../constants/evento.constants');

class EventoValidator {
    async validarCreacion(datos, empresaId) {
        const { titulo, modalidad, fecha_inicio, fecha_fin } = datos;

        if (!titulo || titulo.trim().length < 3) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.TITULO_REQUERIDO
            };
        }

        if (!modalidad || !MODALIDADES.includes(modalidad)) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.MODALIDAD_INVALIDA
            };
        }

        if (!fecha_inicio) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.FECHA_INICIO_REQUERIDA
            };
        }

        if (!fecha_fin) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.FECHA_FIN_REQUERIDA
            };
        }

        if (new Date(fecha_inicio) > new Date(fecha_fin)) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.FECHAS_INVALIDAS
            };
        }

        const empresa = await Empresa.findByPk(empresaId);

        if (!empresa) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.EMPRESA_NO_EXISTE
            };
        }

        if (empresa.estado !== 1) {
            return {
                esValida: false,
                mensaje: MENSAJES_VALIDACION.EMPRESA_NO_APROBADA
            };
        }

        return { esValida: true };
    }

    validarActualizacion(datos) {
        if (datos.estado !== undefined) {
            const estadoInt = parseInt(datos.estado);
            const estadosPermitidos = Object.values(ESTADOS);

            if (!estadosPermitidos.includes(estadoInt)) {
                return {
                    esValida: false,
                    mensaje: `${MENSAJES_VALIDACION.ESTADO_INVALIDO} Los valores permitidos son: ${estadosPermitidos.join(', ')}.`
                };
            }
        }

        return { esValida: true };
    }
}

module.exports = new EventoValidator();
