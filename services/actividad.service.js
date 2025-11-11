const { Actividad, Evento, Lugar, LugarActividad, PonenteActividad } = require('../models');

class ActividadService {
    crearTransaccion() {
        return Actividad.sequelize.transaction();
    }

    async buscarEventoPorId(eventoId) {
        return await Evento.findByPk(eventoId);
    }

    async buscarTodasPorEvento(eventoId) {
        return await Actividad.findAll({
            where: { id_evento: eventoId },
            include: [
                {
                    model: Lugar,
                    as: 'lugares',
                    attributes: ['id', 'nombre', 'descripcion'],
                    through: { attributes: [] }
                }
            ],
            order: [['fecha_actividad', 'ASC'], ['hora_inicio', 'ASC']]
        });
    }

    async buscarPorId(actividadId, opcionesInclude = {}) {
        return await Actividad.findByPk(actividadId, opcionesInclude);
    }

    async crear(eventoId, datosActividad, evento, transaction) {
        const { titulo, hora_inicio, hora_fin, descripcion, fecha_actividad, url, lugares } = datosActividad;

        const actividad = await Actividad.create({
            id_evento: eventoId,
            titulo,
            hora_inicio,
            hora_fin,
            descripcion,
            fecha_actividad,
            url
        }, { transaction });

        if (lugares && Array.isArray(lugares) && lugares.length > 0) {
            await this._asociarLugares(actividad.id_actividad, lugares, transaction);
        }

        return actividad;
    }

    async actualizar(actividadId, datosActualizacion, evento, transaction) {
        const { lugares, ...camposActividad } = datosActualizacion;

        const actividad = await this.buscarPorId(actividadId);

        if (lugares !== undefined && Array.isArray(lugares)) {
            await this._actualizarLugares(actividadId, lugares, evento, transaction);
        }

        const actualizaciones = this._construirObjetoActualizacion(camposActividad);
        await actividad.update(actualizaciones, { transaction });

        return actividad;
    }

    async eliminar(actividadId, transaction) {
        await LugarActividad.destroy({
            where: { id_actividad: actividadId },
            transaction
        });

        await PonenteActividad.destroy({
            where: { id_actividad: actividadId },
            transaction
        });

        const actividad = await this.buscarPorId(actividadId);
        await actividad.destroy({ transaction });
    }

    async validarLugares(idsLugares, idEmpresa) {
        if (!idsLugares || !Array.isArray(idsLugares) || idsLugares.length === 0) {
            return true;
        }

        const lugaresValidos = await Lugar.findAll({
            where: { id: idsLugares, id_empresa: idEmpresa }
        });

        return lugaresValidos.length === idsLugares.length;
    }

    async _asociarLugares(actividadId, idsLugares, transaction) {
        const lugaresActividad = idsLugares.map(id_lugar => ({
            id_lugar,
            id_actividad: actividadId
        }));

        await LugarActividad.bulkCreate(lugaresActividad, { transaction });
    }

    async _actualizarLugares(actividadId, idsLugares, evento, transaction) {
        await LugarActividad.destroy({
            where: { id_actividad: actividadId },
            transaction
        });

        if (idsLugares.length > 0) {
            await this._asociarLugares(actividadId, idsLugares, transaction);
        }
    }

    _construirObjetoActualizacion(campos) {
        const actualizaciones = {};
        const camposPermitidos = ['titulo', 'hora_inicio', 'hora_fin', 'descripcion', 'fecha_actividad', 'url'];

        camposPermitidos.forEach(campo => {
            if (campos[campo] !== undefined) {
                actualizaciones[campo] = campos[campo];
            }
        });

        return actualizaciones;
    }
}

module.exports = new ActividadService();
