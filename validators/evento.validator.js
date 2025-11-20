const { Empresa } = require('../models');
const { MENSAJES_VALIDACION, ESTADOS, MODALIDADES } = require('../constants/evento.constants');
const ActividadService = require('../services/actividad.service');

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
                mensaje: MENSAJES_VALIDACION.EMPRESA_NO_ENCONTRADA
            };
        }

        return { esValida: true };
    }

    validarActualizacion(datos) {
        const { titulo, modalidad, fecha_inicio, fecha_fin } = datos;

        if (titulo !== undefined && (!titulo || titulo.trim().length < 3)) {
            return MENSAJES_VALIDACION.TITULO_REQUERIDO;
        }

        if (modalidad !== undefined && !MODALIDADES.includes(modalidad)) {
            return MENSAJES_VALIDACION.MODALIDAD_INVALIDA;
        }

        if (fecha_inicio && fecha_fin && new Date(fecha_inicio) > new Date(fecha_fin)) {
            return MENSAJES_VALIDACION.FECHAS_INVALIDAS;
        }

        return null;
    }

    validarEstado(estadoActual, nuevoEstado) {
        if (!ESTADOS.includes(nuevoEstado)) {
            return MENSAJES_VALIDACION.ESTADO_INVALIDO;
        }

        if (estadoActual === ESTADOS.CANCELADO) {
            return MENSAJES_VALIDACION.EVENTO_CANCELADO;
        }

        if (estadoActual === ESTADOS.FINALIZADO) {
            return MENSAJES_VALIDACION.EVENTO_FINALIZADO;
        }

        return null;
    }

    async validarAgenda(eventoId) {
        const actividades = await ActividadService.buscarTodasPorEvento(eventoId);

        if (!actividades || actividades.length === 0) {
            return { esValida: true };
        }

        const actividadesPorFecha = this._agruparPorFecha(actividades);

        for (const [fecha, actividadesFecha] of Object.entries(actividadesPorFecha)) {
            const conflicto = await this._verificarSolapamientosInternos(actividadesFecha);
            if (conflicto) {
                return {
                    esValida: false,
                    mensaje: 'No es posible guardar la agenda. Se detectaron actividades con horarios superpuestos.'
                };
            }
        }

        return { esValida: true };
    }

    _agruparPorFecha(actividades) {
        return actividades.reduce((grupos, actividad) => {
            const fecha = actividad.fecha_actividad;
            if (!grupos[fecha]) {
                grupos[fecha] = [];
            }
            grupos[fecha].push(actividad);
            return grupos;
        }, {});
    }

    async _verificarSolapamientosInternos(actividades) {
        for (let i = 0; i < actividades.length; i++) {
            for (let j = i + 1; j < actividades.length; j++) {
                const act1 = actividades[i];
                const act2 = actividades[j];

                const haySolapamiento = this._detectarSolapamientoHorario(
                    act1.hora_inicio,
                    act1.hora_fin,
                    act2.hora_inicio,
                    act2.hora_fin
                );

                if (haySolapamiento) {
                    const lugares1 = act1.lugares ? act1.lugares.map(l => l.id) : [];
                    const lugares2 = act2.lugares ? act2.lugares.map(l => l.id) : [];
                    const compartenSala = lugares1.some(id => lugares2.includes(id));

                    if (compartenSala) {
                        return true; 
                    }
                }
            }
        }
        return false; 
    }

    _detectarSolapamientoHorario(inicio1, fin1, inicio2, fin2) {
        return inicio1 < fin2 && fin1 > inicio2;
    }
}

module.exports = new EventoValidator();
