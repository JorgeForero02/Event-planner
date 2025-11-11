const MENSAJES = {
    CREADA: 'Ubicación creada exitosamente',
    ACTUALIZADA: 'Ubicación actualizada exitosamente',
    ELIMINADA: 'Ubicación eliminada exitosamente',
    OBTENIDA: 'Ubicación obtenida exitosamente',
    LISTA_OBTENIDA: 'Ubicaciones obtenidas exitosamente',
    NO_ENCONTRADA: 'Ubicación no encontrada',
    EMPRESA_NO_ENCONTRADA: 'Empresa no encontrada',
    SIN_PERMISO_CREAR: 'No tiene permisos para crear ubicaciones en esta empresa',
    SIN_PERMISO_MODIFICAR: 'No tiene permisos para modificar esta ubicación',
    SIN_PERMISO_ELIMINAR: 'No tiene permisos para eliminar esta ubicación',
    ERROR_CREAR: 'Error al crear la ubicación',
    ERROR_ACTUALIZAR: 'Error al actualizar ubicación',
    ERROR_ELIMINAR: 'Error al eliminar ubicación',
    ERROR_OBTENER: 'Error al obtener ubicación'
};

const MENSAJES_VALIDACION = {
    DIRECCION_REQUERIDA: 'La dirección es requerida y debe tener al menos 3 caracteres',
    CIUDAD_REQUERIDA: 'La ciudad es requerida',
    CIUDAD_NO_ENCONTRADA: 'Ciudad no encontrada',
    CAPACIDAD_INVALIDA: 'La capacidad, si se especifica, debe ser al menos 1',
    EMPRESA_NO_ENCONTRADA: 'Empresa no encontrada'
};

module.exports = {
    MENSAJES,
    MENSAJES_VALIDACION
};
