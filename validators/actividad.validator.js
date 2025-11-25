const { MENSAJES_VALIDACION } = require('../constants/actividad.constants');
const { Actividad, Lugar, Ponente, PonenteActividad, LugarActividad } = require('../models');
const { Op } = require('sequelize');

class ActividadValidator {

    validarCreacion(datosActividad, evento) {
        const { titulo, hora_inicio, hora_fin, fecha_actividad } = datosActividad;

        if (!titulo || titulo.trim().length < 3) {
            return MENSAJES_VALIDACION.TITULO_REQUERIDO;
        }

        if (!hora_inicio || !hora_fin) {
            return MENSAJES_VALIDACION.HORAS_REQUERIDAS;
        }

        if (hora_inicio >= hora_fin) {
            return MENSAJES_VALIDACION.HORAS_INVALIDAS;
        }

        if (!fecha_actividad) {
            return MENSAJES_VALIDACION.FECHA_REQUERIDA;
        }

        const errorFecha = this._validarFechaActividad(fecha_actividad, evento);
        if (errorFecha) {
            return errorFecha;
        }

        return null;
    }

    validarActualizacion(datosActualizacion, actividad, evento) {
        const horaInicio = datosActualizacion.hora_inicio || actividad.hora_inicio;
        const horaFin = datosActualizacion.hora_fin || actividad.hora_fin;

        if (horaInicio >= horaFin) {
            return MENSAJES_VALIDACION.HORAS_INVALIDAS;
        }

        const fechaActividad = datosActualizacion.fecha_actividad || actividad.fecha_actividad;
        const errorFecha = this._validarFechaActividad(fechaActividad, evento);
        if (errorFecha) {
            return errorFecha;
        }

        return null;
    }

    async validarSolapamiento(actividadId, eventoId, fechaActividad, horaInicio, horaFin, idsLugares = [], idsPonentes = []) {
        const actividadesEnFecha = await Actividad.findAll({
            where: {
                id_evento: eventoId,
                fecha_actividad: fechaActividad,
                id_actividad: {
                    [Op.ne]: actividadId || 0 
                }
            },
            include: [
                {
                    model: Lugar,
                    as: 'lugares',
                    attributes: ['id'],
                    through: { attributes: [] }
                }
            ]
        });

        for (const actividad of actividadesEnFecha) {
            const haySolapamiento = this._detectarSolapamientoHorario(
                horaInicio,
                horaFin,
                actividad.hora_inicio,
                actividad.hora_fin
            );

            if (haySolapamiento) {
                const lugaresActividad = actividad.lugares.map(l => l.id);
                const compartenSala = idsLugares.some(id => lugaresActividad.includes(id));

                if (compartenSala) {
                    return 'Conflicto detectado: el horario seleccionado se superpone con otra actividad en la misma sala.';
                }

                if (idsPonentes && idsPonentes.length > 0) {
                    const ponentesActividad = await PonenteActividad.findAll({
                        where: { id_actividad: actividad.id_actividad },
                        attributes: ['id_ponente']
                    });

                    const idsPonenteActividad = ponentesActividad.map(pa => pa.id_ponente);
                    const compartenPonente = idsPonentes.some(id => idsPonenteActividad.includes(id));

                    if (compartenPonente) {
                        return 'Conflicto detectado: el horario seleccionado se superpone con otra actividad con el mismo ponente.';
                    }
                }
            }
        }

        return null; 
    }

    _detectarSolapamientoHorario(inicio1, fin1, inicio2, fin2) {
        return inicio1 < fin2 && fin1 > inicio2;
    }

    _validarFechaActividad(fechaActividad, evento) {
        if (fechaActividad < evento.fecha_inicio || fechaActividad > evento.fecha_fin) {
            return MENSAJES_VALIDACION.FECHA_FUERA_RANGO;
        }
        return null;
    }
}

module.exports = new ActividadValidator();
