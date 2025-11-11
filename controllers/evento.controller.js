const EventoService = require('../services/evento.service');
const EventoValidator = require('../validators/evento.validator');
const PermisosService = require('../services/permisos.service');
const AuditoriaService = require('../services/auditoriaService');
const { MENSAJES, ESTADOS } = require('../constants/evento.constants');

class EventoController {
    async crearEvento(req, res) {
        const transaction = await EventoService.crearTransaccion();

        try {
            const usuario = req.usuario;
            const empresaId = req.body.id_empresa || req.adminEmpresa?.id_empresa;

            const validacion = await EventoValidator.validarCreacion(req.body, empresaId);

            if (!validacion.esValida) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: validacion.mensaje
                });
            }

            const resultado = await EventoService.crear({
                ...req.body,
                id_empresa: empresaId,
                id_creador: usuario.id
            }, transaction);

            await AuditoriaService.registrar({
                mensaje: `Se creó el evento: ${resultado.evento.titulo}`,
                tipo: 'POST',
                accion: 'crear_evento',
                usuario: { id: usuario.id, nombre: usuario.nombre }
            });

            await transaction.commit();

            return res.status(201).json({
                success: true,
                message: MENSAJES.CREADO,
                data: {
                    id: resultado.evento.id,
                    titulo: resultado.evento.titulo,
                    modalidad: resultado.evento.modalidad,
                    estado: resultado.evento.estado,
                    fecha_inicio: resultado.evento.fecha_inicio,
                    fecha_fin: resultado.evento.fecha_fin,
                    id_empresa: resultado.evento.id_empresa,
                    id_creador: resultado.evento.id_creador
                }
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al crear evento:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_CREAR,
                error: error.message
            });
        }
    }

    async obtenerEventos(req, res) {
        try {
            const { id_empresa, estado, modalidad } = req.query;
            const usuario = req.usuario;

            const whereClause = EventoService.construirFiltros({
                id_empresa,
                estado,
                modalidad,
                rol: usuario.rol,
                empresaUsuario: usuario.rolData?.id_empresa
            });

            const eventos = await EventoService.obtenerTodos(whereClause);

            return res.json({
                success: true,
                message: MENSAJES.LISTA_OBTENIDA,
                total: eventos.length,
                data: eventos
            });
        } catch (error) {
            console.error('Error al obtener eventos:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async obtenerEventoById(req, res) {
        try {
            const { eventoId } = req.params;
            const usuario = req.usuario;

            const whereClause = EventoService.construirFiltros({
                id: eventoId,
                rol: usuario.rol,
                empresaUsuario: usuario.rolData?.id_empresa
            });

            const evento = await EventoService.buscarUno(whereClause);

            if (!evento) {
                return res.status(404).json({
                    success: false,
                    message: MENSAJES.NO_ENCONTRADO_O_SIN_PERMISO
                });
            }

            return res.json({
                success: true,
                message: MENSAJES.OBTENIDO,
                data: evento
            });
        } catch (error) {
            console.error('Error al obtener evento:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_OBTENER,
                error: error.message
            });
        }
    }

    async actualizarEvento(req, res) {
        const transaction = await EventoService.crearTransaccion();

        try {
            const eventoActualizado = req.evento;

            const validacion = EventoValidator.validarActualizacion(req.body);

            if (!validacion.esValida) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: validacion.mensaje
                });
            }

            const actualizaciones = EventoService.construirActualizaciones(req.body);

            await eventoActualizado.update(actualizaciones, { transaction });

            await AuditoriaService.registrar({
                mensaje: `Se actualizó el evento: ${eventoActualizado.titulo}`,
                tipo: 'PUT',
                accion: 'actualizar_evento',
                usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.ACTUALIZADO,
                data: eventoActualizado
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar evento:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_ACTUALIZAR,
                error: error.message
            });
        }
    }

    async eliminarEvento(req, res) {
        const transaction = await EventoService.crearTransaccion();

        try {
            const eventoActualizado = req.evento;

            await eventoActualizado.update(
                { estado: ESTADOS.CANCELADO, fecha_actualizacion: new Date() },
                { transaction }
            );

            await AuditoriaService.registrar({
                mensaje: `Se canceló el evento: ${eventoActualizado.titulo}`,
                tipo: 'DELETE',
                accion: 'cancelar_evento',
                usuario: { id: req.usuario.id, nombre: req.usuario.nombre }
            });

            await transaction.commit();

            return res.json({
                success: true,
                message: MENSAJES.CANCELADO
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al eliminar evento:', error);
            return res.status(500).json({
                success: false,
                message: MENSAJES.ERROR_CANCELAR,
                error: error.message
            });
        }
    }
}

module.exports = new EventoController();
