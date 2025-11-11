const { MENSAJES_VALIDACION } = require('../constants/actividad.constants');

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

    _validarFechaActividad(fechaActividad, evento) {
        const fechaAct = new Date(fechaActividad);
        const fechaInicioEvento = new Date(evento.fecha_inicio);
        const fechaFinEvento = new Date(evento.fecha_fin);

        if (fechaAct < fechaInicioEvento || fechaAct > fechaFinEvento) {
            return `La fecha de la actividad (${fechaActividad}) debe estar dentro del rango del evento (${evento.fecha_inicio} al ${evento.fecha_fin})`;
        }

        return null;
    }
}

module.exports = new ActividadValidator();
