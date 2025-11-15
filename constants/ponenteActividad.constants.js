const MENSAJES = {
    ASIGNADO: 'Ponente asignado a la actividad exitosamente',
    ACTUALIZADO: 'Asignación actualizada exitosamente',
    ELIMINADO: 'Ponente removido de la actividad exitosamente',
    OBTENIDO: 'Asignación obtenida exitosamente',
    LISTA_OBTENIDA: 'Asignaciones obtenidas exitosamente',
    NO_ENCONTRADO: 'Asignación no encontrada',
    PONENTE_NO_ENCONTRADO: 'Ponente no encontrado',
    ACTIVIDAD_NO_ENCONTRADA: 'Actividad no encontrada',
    YA_ASIGNADO: 'Este ponente ya está asignado a esta actividad',
    SOLICITUD_ENVIADA: 'Solicitud de cambio enviada exitosamente',
    SOLICITUD_PROCESADA: 'Solicitud procesada exitosamente',
    SIN_PERMISO_CREAR: 'No tiene permisos para asignar ponentes',
    SIN_PERMISO_MODIFICAR: 'No tiene permisos para modificar esta asignación',
    SIN_PERMISO_ELIMINAR: 'No tiene permisos para eliminar esta asignación',
    SIN_PERMISO_VER: 'No tiene permisos para ver esta información',
    ERROR_CREAR: 'Error al asignar ponente',
    ERROR_ACTUALIZAR: 'Error al actualizar asignación',
    ERROR_ELIMINAR: 'Error al eliminar asignación',
    ERROR_OBTENER: 'Error al obtener asignación',
    ERROR_SOLICITUD: 'Error al procesar solicitud de cambio'
};

const MENSAJES_VALIDACION = {
    PONENTE_REQUERIDO: 'El ID del ponente es requerido',
    ACTIVIDAD_REQUERIDA: 'El ID de la actividad es requerido',
    ESTADO_INVALIDO: 'Estado inválido',
    CAMBIOS_REQUERIDOS: 'Debe especificar los cambios solicitados',
    JUSTIFICACION_REQUERIDA: 'Debe proporcionar una justificación para el cambio'
};

const ESTADOS_PONENTE_ACTIVIDAD = {
    PENDIENTE: 'pendiente',
    ACEPTADO: 'aceptado',
    RECHAZADO: 'rechazado',
    SOLICITUD_CAMBIO: 'solicitud_cambio'
};

module.exports = {
    MENSAJES,
    MENSAJES_VALIDACION,
    ESTADOS_PONENTE_ACTIVIDAD
};
