const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { 
    Inscripcion, 
    Asistente, 
    Evento, 
    Empresa, 
    Usuario,
    Lugar,
    Actividad,
    AdministradorEmpresa,
    Administrador,
    Ponente,
    sequelize 
} = require('../models');
const ApiResponse = require('../utils/response');
const AuditoriaService = require('../services/auditoriaService');
const EmailService = require('../services/emailService');

const findOrCreateAsistente = async (usuarioId, transaction) => {
    try {
        let asistente = await Asistente.findOne({ 
            where: { id_usuario: usuarioId },
            transaction
        });

        if (asistente) {
            return asistente;
        }

        asistente = await Asistente.create({ 
            id_usuario: usuarioId 
        }, { transaction });
        
        return asistente;

    } catch (error) {
        console.error("Error en findOrCreateAsistente:", error);
        throw new Error("Error al buscar o crear el perfil de asistente.");
    }
};


const InscripcionController = {

    obtenerEventosDisponibles: async (req, res, next) => {
        try {
            const { modalidad } = req.query;
            const whereClause = {
                estado: 1
            };

            if (modalidad) {
                whereClause.modalidad = modalidad;
            }

            const eventos = await Evento.findAll({
                where: whereClause,
                attributes: [
                    'id',
                    'titulo',
                    'descripcion',
                    'modalidad',
                    'hora',
                    'cupos',
                    'fecha_inicio',
                    'fecha_fin',
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM Inscripcion WHERE Inscripcion.id_evento = Evento.id)'),
                        'inscritos'
                    ]
                ],
                include: [
                    {
                        model: Empresa,
                        as: 'empresa',
                        attributes: ['id', 'nombre']
                    },
                    {
                        model: Actividad,
                        as: 'actividades',
                        attributes: ['id_actividad'],
                        limit: 1,
                        include: [{
                            model: Lugar,
                            as: 'lugares',
                            attributes: ['nombre'],
                            through: { attributes: [] }
                        }]
                    }
                ],
                order: [['fecha_inicio', 'ASC']]
            });

            const eventosConDisponibilidad = eventos.map(evento => {
                const data = evento.toJSON();
                const cuposDisponibles = data.cupos - data.inscritos;
                let estadoEvento = 'Disponible';
                
                if (cuposDisponibles <= 0) {
                    estadoEvento = 'Lleno';
                }

                const lugarNombre = data.actividades?.[0]?.lugares?.[0]?.nombre || null;

                return {
                    id: data.id,
                    titulo: data.titulo,
                    descripcion: data.descripcion,
                    modalidad: data.modalidad,
                    hora: data.hora,
                    fecha_inicio: data.fecha_inicio,
                    fecha_fin: data.fecha_fin,
                    lugar: lugarNombre,
                    cupo_total: data.cupos,
                    cupos_disponibles: cuposDisponibles,
                    estado_evento: estadoEvento,
                    empresa: data.empresa.nombre
                };
            });
            
            return ApiResponse.success(res, eventosConDisponibilidad, 'Eventos disponibles obtenidos');
        } catch (error) {
            next(error);
        }
    },

    inscribirEvento: async (req, res, next) => {
        const transaction = await sequelize.transaction();
        try {
            const { id_evento } = req.body;
            const usuarioId = req.usuario.id;

            const asistente = await findOrCreateAsistente(usuarioId, transaction);
            const id_asistente = asistente.id_asistente;

            const evento = await Evento.findByPk(id_evento, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!evento) {
                await transaction.rollback();
                return ApiResponse.notFound(res, 'Evento no encontrado');
            }

            if (evento.estado !== 1) {
                await transaction.rollback();
                return ApiResponse.error(res, 'Este evento no está disponible para inscripción.', 400);
            }

            const inscripcionExistente = await Inscripcion.findOne({
                where: { id_asistente, id_evento },
                transaction
            });

            if (inscripcionExistente) {
                await transaction.rollback();
                return ApiResponse.error(res, 'Ya estás inscrito en este evento', 409);
            }

            const inscritosCount = await Inscripcion.count({
                where: { id_evento },
                transaction
            });

            if (evento.cupos !== null && inscritosCount >= evento.cupos) {
                await transaction.rollback();
                return ApiResponse.error(res, 'No es posible la inscripción porque el evento está lleno.', 400);
            }

            const nuevaInscripcion = await Inscripcion.create({
                fecha: new Date().toISOString().split('T')[0],
                codigo: uuidv4(),
                estado: 'Confirmada',
                id_asistente: id_asistente,
                id_evento: id_evento
            }, { transaction });

            await AuditoriaService.registrarCreacion(
                'inscripcion',
                {
                    id: nuevaInscripcion.id,
                    evento: evento.titulo,
                    asistente: req.usuario.nombre
                },
                req.usuario
            );
            
            const usuarioInfo = await Usuario.findByPk(usuarioId, { attributes: ['correo', 'nombre'] });
            
            try {
                 await EmailService.enviarConfirmacionInscripcion(
                    usuarioInfo.correo,
                    usuarioInfo.nombre,
                    evento.titulo,
                    evento.fecha_inicio,
                    nuevaInscripcion.codigo
                );
            } catch (emailError) {
                console.error('Error enviando correo de confirmación:', emailError);
            }

            await transaction.commit();

            return ApiResponse.success(
                res,
                nuevaInscripcion,
                'Tu inscripción al evento se ha realizado exitosamente.',
                201
            );

        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    },

    obtenerMisInscripciones: async (req, res, next) => {
        try {
            const usuarioId = req.usuario.id;

            const asistente = await Asistente.findOne({ where: { id_usuario: usuarioId } });

            if (!asistente) {
                return ApiResponse.success(res, [], 'No tienes inscripciones.');
            }

            const inscripciones = await Inscripcion.findAll({
                where: { id_asistente: asistente.id_asistente },
                include: [
                    {
                        model: Evento,
                        as: 'evento',
                        attributes: ['id', 'titulo', 'fecha_inicio', 'fecha_fin', 'modalidad', 'hora']
                    }
                ],
                order: [['fecha', 'DESC']]
            });

            return ApiResponse.success(res, inscripciones, 'Mis inscripciones obtenidas');

        } catch (error) {
            next(error);
        }
    },

    inscribirEquipo: async (req, res, next) => {
        const { id_evento, cedulas: cedulasRaw = [] } = req.body;
        const gerente = req.usuario;
        const cedulas = cedulasRaw.map(c => String(c));

        if (!id_evento || cedulas.length === 0) {
            return ApiResponse.error(res, "Se requiere 'id_evento' y un array de 'cedulas'.", 400);
        }

        const transaction = await sequelize.transaction();
        try {
            const evento = await Evento.findByPk(id_evento, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!evento) {
                await transaction.rollback();
                return ApiResponse.notFound(res, 'Evento no encontrado');
            }
            if (evento.estado !== 1) {
                await transaction.rollback();
                return ApiResponse.error(res, 'Este evento no está disponible para inscripción.', 400);
            }
            
            if (evento.id_empresa !== gerente.rolData.id_empresa) {
                await transaction.rollback();
                return ApiResponse.forbidden(res, 'Solo puedes inscribir usuarios en eventos de tu propia empresa.');
            }

            const usuarios = await Usuario.findAll({
                where: { cedula: { [Op.in]: cedulas } },
                attributes: ['id', 'correo', 'nombre', 'cedula'],
                transaction
            });
            
            const mapUsuarios = new Map(usuarios.map(u => [u.cedula, u]));
            const idsUsuarios = usuarios.map(u => u.id);
            
            const [admins, adminEmpresas, ponentes] = await Promise.all([
                Administrador.findAll({ where: { id_usuario: { [Op.in]: idsUsuarios } }, attributes: ['id_usuario'], transaction }),
                AdministradorEmpresa.findAll({ where: { id_usuario: { [Op.in]: idsUsuarios } }, attributes: ['id_usuario', 'id_empresa'], transaction }),
                Ponente.findAll({ where: { id_usuario: { [Op.in]: idsUsuarios } }, attributes: ['id_usuario'], transaction })
            ]);

            const mapAdmins = new Set(admins.map(u => u.id_usuario));
            const mapPonentes = new Set(ponentes.map(u => u.id_usuario));
            const mapAdminEmpresas = new Map(adminEmpresas.map(u => [u.id_usuario, u.id_empresa]));

            let usuariosParaInscribir = [];
            const resultados = {
                exitosas: [],
                fallidas: []
            };

            for (const cedula of cedulas) {
                const usuario = mapUsuarios.get(cedula);

                if (!usuario) {
                    resultados.fallidas.push({ cedula, motivo: 'Cédula no encontrada' });
                    continue;
                }

                if (mapAdmins.has(usuario.id) || mapPonentes.has(usuario.id)) {
                    resultados.fallidas.push({ cedula: usuario.cedula, nombre: usuario.nombre, motivo: 'No se puede invitar a un Administrador o Ponente externo.' });
                    continue;
                }

                const idEmpresaDelUsuario = mapAdminEmpresas.get(usuario.id);

                if (idEmpresaDelUsuario) {
                    if (idEmpresaDelUsuario === gerente.rolData.id_empresa) {
                        usuariosParaInscribir.push(usuario);
                    } else {
                        resultados.fallidas.push({ cedula: usuario.cedula, nombre: usuario.nombre, motivo: 'Este usuario pertenece a otra empresa.' });
                    }
                } else {
                    usuariosParaInscribir.push(usuario);
                }
            }
            
            const inscritosCount = await Inscripcion.count({ where: { id_evento }, transaction });
            const cuposDisponibles = evento.cupos - inscritosCount;

            if (cuposDisponibles < usuariosParaInscribir.length) {
                await transaction.rollback();
                return ApiResponse.error(res, `No hay suficientes cupos. Disponibles: ${cuposDisponibles}, Intentando inscribir: ${usuariosParaInscribir.length}`, 400);
            }

            for (const usuario of usuariosParaInscribir) {
                const asistente = await findOrCreateAsistente(usuario.id, transaction);
                const id_asistente = asistente.id_asistente;

                const inscripcionExistente = await Inscripcion.findOne({
                    where: { id_asistente, id_evento },
                    transaction
                });

                if (inscripcionExistente) {
                    resultados.fallidas.push({ cedula: usuario.cedula, nombre: usuario.nombre, motivo: 'Ya está inscrito' });
                    continue;
                }

                const nuevaInscripcion = await Inscripcion.create({
                    fecha: new Date().toISOString().split('T')[0],
                    codigo: uuidv4(),
                    estado: 'Pendiente',
                    id_asistente: id_asistente,
                    id_evento: id_evento
                }, { transaction });

                try {
                    await EmailService.enviarInvitacionInscripcion(
                        usuario.correo,
                        usuario.nombre,
                        gerente.nombre,
                        evento.titulo,
                        nuevaInscripcion.codigo
                    );
                    resultados.exitosas.push({ cedula: usuario.cedula, nombre: usuario.nombre, estado: 'Invitación enviada' });
                } catch (emailError) {
                    resultados.fallidas.push({ cedula: usuario.cedula, nombre: usuario.nombre, motivo: 'Inscrito, pero falló el envío de email' });
                }
            }

            await transaction.commit();
            return ApiResponse.success(res, resultados, 'Proceso de inscripción finalizado.');

        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    },

    confirmarInscripcion: async (req, res, next) => {
        const { codigo } = req.params;
        const transaction = await sequelize.transaction();

        try {
            const inscripcion = await Inscripcion.findOne({
                where: { codigo: codigo },
                include: { model: Evento, as: 'evento' },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!inscripcion) {
                await transaction.rollback();
                return ApiResponse.notFound(res, 'El enlace de confirmación no es válido o ha expirado.');
            }

            if (inscripcion.estado === 'Confirmada') {
                await transaction.rollback();
                return ApiResponse.error(res, 'Ya has confirmado tu asistencia a este evento.', 400);
            }
            
            if (inscripcion.estado !== 'Pendiente') {
                 await transaction.rollback();
                 return ApiResponse.error(res, `Esta inscripción no se puede confirmar (Estado: ${inscripcion.estado}).`, 400);
            }

            const evento = inscripcion.evento;

            const inscritosCount = await Inscripcion.count({
                where: { 
                    id_evento: evento.id,
                    estado: 'Confirmada'
                }, 
                transaction
            });

            if (evento.cupos !== null && inscritosCount >= evento.cupos) {
                await transaction.rollback();
                return ApiResponse.error(res, 'Lo sentimos, mientras confirmabas, el evento ha alcanzado su cupo máximo.', 400);
            }

            await inscripcion.update({ 
                estado: 'Confirmada' 
            }, { transaction });

            await transaction.commit();
            
            return res.send(`
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: #28a745;">¡Inscripción Confirmada!</h1>
                    <p>Gracias, tu asistencia al evento <strong>${evento.titulo}</strong> ha sido confirmada.</p>
                </div>
            `);

        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    }
};

module.exports = InscripcionController;