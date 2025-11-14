const { Evento, Empresa, Usuario, Actividad, Inscripcion, Lugar, Asistente , AdministradorEmpresa} = require('../models');
const { ESTADOS, MODALIDADES } = require('../constants/evento.constants');

class EventoService {
    crearTransaccion() {
        return Evento.sequelize.transaction();
    }

    _obtenerFechaHoy() {
        return new Date().toISOString().split('T')[0];
    }

    async _actualizarEstadoFinalizado(evento) {
        if (!evento || evento.estado === ESTADOS.CANCELADO || evento.estado === ESTADOS.FINALIZADO) {
            return evento;
        }

        const fechaHoy = this._obtenerFechaHoy();

        if (evento.estado === ESTADOS.PUBLICADO && fechaHoy > evento.fecha_fin) {
            try {
                await evento.update({ estado: ESTADOS.FINALIZADO });
            } catch (error) {
                console.error(`Error al auto-finalizar evento ${evento.id}:`, error.message);
            }
        }
        return evento;
    }

    async crear(datosEvento, transaction) {
        const evento = await Evento.create({
            ...datosEvento,
            estado: ESTADOS.BORRADOR,
            fecha_creacion: new Date(),
            fecha_actualizacion: new Date()
        }, { transaction });

        return { evento };
    }

    construirFiltros({ id, id_empresa, estado, modalidad, rol, empresaUsuario }) {
        const where = {};

        if (id) where.id = id;

        if (rol === 'gerente' || rol === 'organizador') {
            where.id_empresa = empresaUsuario;
        } else if (rol === 'administrador') {
            if (id_empresa) where.id_empresa = id_empresa;
        } else {
            where.estado = ESTADOS.PUBLICADO;
            if (id_empresa) where.id_empresa = id_empresa;
        }

        if (estado !== undefined) {
            if (rol === 'administrador') {
                where.estado = estado;
            } else {
                where.estado = ESTADOS.PUBLICADO;
            }
        }

        if (modalidad) where.modalidad = modalidad;

        return where;
    }

    async obtenerTodos(whereClause) {
        const eventos = await Evento.findAll({
            where: whereClause,
            include: [
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['id', 'nombre', 'correo']
                },
                {
                    model: Actividad,
                    as: 'actividades',
                    attributes: ['id_actividad', 'titulo', 'fecha_actividad']
                }
            ],
            order: [['fecha_creacion', 'DESC']]
        });
        const eventosActualizados = await Promise.all(
            eventos.map(evento => this._actualizarEstadoFinalizado(evento))
        );
        return eventosActualizados;
    }

    async buscarUno(whereClause) {
        const evento = await Evento.findOne({
            where: whereClause,
            include: [
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['id', 'nombre', 'correo']
                },
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['id', 'nombre', 'correo']
                },
                {
                    model: Actividad,
                    as: 'actividades',
                    include: [
                        {
                            model: Lugar,
                            as: 'lugares',
                            attributes: ['id', 'nombre'],
                            through: { attributes: [] }
                        }
                    ]
                },
                {
                    model: Inscripcion,
                    as: 'inscripciones',
                    attributes: ['id', 'fecha', 'estado']
                }
            ]
        });

        if (!evento) {
            return null;
        }
        
        return await this._actualizarEstadoFinalizado(evento);
    }

    construirActualizaciones(datos) {
        const camposPermitidos = ['titulo', 'descripcion', 'modalidad', 'hora', 'cupos', 'estado'];
        const actualizaciones = {};

        camposPermitidos.forEach(campo => {
            if (datos[campo] !== undefined) {
                actualizaciones[campo] = datos[campo];
            }
        });

        actualizaciones.fecha_actualizacion = new Date();

        return actualizaciones;
    }

    async obtenerNotificacionesCancelacion(evento) {
        const { id, id_creador } = evento;

        const inscripciones = await Inscripcion.findAll({
            where: {
                id_evento: id,
                estado: { [require('sequelize').Op.in]: ['Confirmada', 'Pendiente'] }
            },
            include: [{
                model: Asistente,
                as: 'asistente',
                required: true,
                include: [{
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre', 'correo'],
                    required: true
                }]
            }]
        });
    
        const asistentesMap = new Map();
        inscripciones.forEach(i => {
            const usuario = i.asistente.usuario.toJSON();
            asistentesMap.set(usuario.correo, usuario);
        });

        const creador = await Usuario.findByPk(id_creador, {
            attributes: ['nombre', 'correo']
        });
        const creadorJson = creador ? creador.toJSON() : null;

        if (creadorJson) {
            asistentesMap.delete(creadorJson.correo);
        }
        
        return {
            asistentes: Array.from(asistentesMap.values()),
            creador: creadorJson
        };
    }
}

module.exports = new EventoService();
