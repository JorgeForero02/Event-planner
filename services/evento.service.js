const { Evento, Empresa, Usuario, Actividad, Inscripcion, Lugar } = require('../models');
const { ESTADOS, MODALIDADES } = require('../constants/evento.constants');

class EventoService {
    crearTransaccion() {
        return Evento.sequelize.transaction();
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
        return await Evento.findAll({
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
    }

    async buscarUno(whereClause) {
        return await Evento.findOne({
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
}

module.exports = new EventoService();
