async enviarEncuestasMasivas(encuestaId, transaction) {
    const encuesta = await this.buscarPorId(encuestaId);

    if (!encuesta) {
        throw new Error('Encuesta no encontrada');
    }

    let asistentes = [];
    let eventoId = null;

    // Obtener eventoId desde el campo directo o desde las relaciones
    if (encuesta.id_evento) {
        eventoId = encuesta.id_evento;
    } else if (encuesta.evento && encuesta.evento. id) {
        eventoId = encuesta. evento.id;
    } else if (encuesta.id_actividad || encuesta.actividad) {
        // Si la encuesta es de una actividad, obtener el evento de esa actividad
        const actividadId = encuesta.id_actividad || encuesta.actividad?. id_actividad;
        
        if (actividadId) {
            const actividad = await Actividad. findByPk(actividadId, {
                attributes: ['id_actividad', 'id_evento']
            });
            
            console.log(`Actividad encontrada:`, actividad?. toJSON()); // ← Debug
            
            if (actividad && actividad.id_evento) {
                eventoId = actividad.id_evento;
            }
        }
    }

    console.log(`EventoId final: ${eventoId}`); // ← Debug

    // Buscar asistentes inscritos en el evento
    if (eventoId) {
        console.log(`Buscando asistentes para evento ID: ${eventoId}`);
        
        const inscripciones = await Inscripcion. findAll({
            where: {
                id_evento: eventoId,
                estado: { [Op.in]: ['Confirmada', 'Pendiente'] }
            },
            include: [{
                model: Asistente,
                as: 'asistente',
                required: true,
                include: [{
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'correo'],
                    required: true
                }]
            }]
        });

        console.log(`Inscripciones encontradas: ${inscripciones.length}`);

        asistentes = inscripciones.map(i => ({
            id: i.asistente.id_asistente,
            nombre: i. asistente.usuario.nombre,
            correo: i. asistente.usuario.correo
        }));

        console.log(`Asistentes a enviar encuesta: ${asistentes.length}`);
    } else {
        console.log('No se encontró evento asociado a la encuesta');
    }

    const envios = [];
    for (const asistente of asistentes) {
        const resultado = await this.enviarEncuestaAsistente(
            encuestaId,
            asistente. id,
            transaction
        );

        envios.push({
            asistente,
            url: resultado.url_personalizada
        });
    }

    console.log(`Total de envíos preparados: ${envios.length}`);

    return envios;
}
