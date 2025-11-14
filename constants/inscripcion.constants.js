const ESTADOS = {
    PENDIENTE: 'Pendiente',
    CONFIRMADA: 'Confirmada',
    CANCELADA: 'Cancelada'
};

const MENSAJES = {
    EVENTOS_DISPONIBLES_OBTENIDOS: 'Eventos disponibles obtenidos',
    INSCRIPCION_EXITOSA: 'Tu inscripción al evento se ha realizado exitosamente.',
    MIS_INSCRIPCIONES_OBTENIDAS: 'Mis inscripciones obtenidas',
    PROCESO_INSCRIPCION_FINALIZADO: 'Proceso de inscripción finalizado.',
    EVENTO_NO_ENCONTRADO: 'Evento no encontrado',
    EVENTO_NO_DISPONIBLE: 'Este evento no está disponible para inscripción.',
    YA_INSCRITO: 'Ya estás inscrito en este evento',
    EVENTO_LLENO: 'No es posible la inscripción porque el evento está lleno.',
    SOLO_EVENTOS_PROPIA_EMPRESA: 'Solo puedes inscribir usuarios en eventos de tu propia empresa.',
    ENLACE_INVALIDO: 'El enlace de confirmación no es válido o ha expirado.',
    YA_CONFIRMADA: 'Ya has confirmado tu asistencia a este evento.',
    EVENTO_FINALIZADO: 'No puedes inscribirte a un evento que ya ha finalizado.',
    CUPO_ALCANZADO_CONFIRMACION: 'Lo sentimos, mientras confirmabas, el evento ha alcanzado su cupo máximo.'
};

const MENSAJES_VALIDACION = {
    CAMPOS_REQUERIDOS_EQUIPO: "Se requiere 'id_evento' y un array de 'cedulas'."
};

module.exports = {
    ESTADOS,
    MENSAJES,
    MENSAJES_VALIDACION
};
