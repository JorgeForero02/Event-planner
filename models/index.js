const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Administrador = require('./Administrador');
const Asistente = require('./Asistente');
const Ponente = require('./Ponente');
const Empresa = require('./Empresa');
const AdministradorEmpresa = require('./AdministradorEmpresa');
const Pais = require('./Pais');
const Ciudad = require('./Ciudad');
const Ubicacion = require('./Ubicacion');
const Lugar = require('./Lugar');
const Evento = require('./Evento');
const Actividad = require('./Actividad');
const LugarActividad = require('./LugarActividad');
const PonenteActividad = require('./PonenteActividad');
const Inscripcion = require('./Inscripcion');
const Asistencia = require('./Asistencia');
const TipoNotificacion = require('./TipoNotificacion');
const Notificacion = require('./Notificacion');
const Auditoria = require('./Auditoria');

// Relaciones
Usuario.hasOne(Administrador, { foreignKey: 'id_usuario', as: 'administrador' });
Administrador.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Usuario.hasOne(Asistente, { foreignKey: 'id_usuario', as: 'asistente' });
Asistente.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Usuario.hasOne(Ponente, { foreignKey: 'id_usuario', as: 'ponente' });
Ponente.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Usuario.hasMany(AdministradorEmpresa, { foreignKey: 'id_usuario', as: 'empresas' });
AdministradorEmpresa.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Empresa.hasMany(AdministradorEmpresa, { foreignKey: 'id_empresa', as: 'administradores' });
AdministradorEmpresa.belongsTo(Empresa, { foreignKey: 'id_empresa', as: 'empresa' });

Pais.hasMany(Ciudad, { foreignKey: 'id_pais', as: 'ciudades' });
Ciudad.belongsTo(Pais, { foreignKey: 'id_pais', as: 'pais' });

Ciudad.hasMany(Ubicacion, { foreignKey: 'id_ciudad', as: 'ubicaciones' });
Ubicacion.belongsTo(Ciudad, { foreignKey: 'id_ciudad', as: 'ciudad' });

Ubicacion.hasMany(Lugar, { foreignKey: 'id_ubicacion', as: 'lugares' });
Lugar.belongsTo(Ubicacion, { foreignKey: 'id_ubicacion', as: 'ubicacion' });

Evento.hasMany(Actividad, { foreignKey: 'id_evento', as: 'actividades' });
Actividad.belongsTo(Evento, { foreignKey: 'id_evento', as: 'evento' });

Actividad.belongsToMany(Lugar, {
  through: LugarActividad,
  foreignKey: 'id_actividad',
  otherKey: 'id_lugar',
  as: 'lugares'
});
Lugar.belongsToMany(Actividad, {
  through: LugarActividad,
  foreignKey: 'id_lugar',
  otherKey: 'id_actividad',
  as: 'actividades'
});

Ponente.belongsToMany(Actividad, {
  through: PonenteActividad,
  foreignKey: 'id_ponente',
  otherKey: 'id_actividad',
  as: 'actividades'
});
Actividad.belongsToMany(Ponente, {
  through: PonenteActividad,
  foreignKey: 'id_actividad',
  otherKey: 'id_ponente',
  as: 'ponentes'
});

Asistente.hasMany(Inscripcion, { foreignKey: 'id_asistente', as: 'inscripciones' });
Inscripcion.belongsTo(Asistente, { foreignKey: 'id_asistente', as: 'asistente' });

Evento.hasMany(Inscripcion, { foreignKey: 'id_evento', as: 'inscripciones' });
Inscripcion.belongsTo(Evento, { foreignKey: 'id_evento', as: 'evento' });

Inscripcion.hasMany(Asistencia, { foreignKey: 'inscripcion', as: 'asistencias' });
Asistencia.belongsTo(Inscripcion, { foreignKey: 'inscripcion', as: 'inscripcionInfo' });

TipoNotificacion.hasMany(Notificacion, { foreignKey: 'id_TipoNotificacion', as: 'notificaciones' });
Notificacion.belongsTo(TipoNotificacion, { foreignKey: 'id_TipoNotificacion', as: 'tipo' });

Evento.hasMany(Notificacion, { foreignKey: 'id_evento', as: 'notificaciones' });
Notificacion.belongsTo(Evento, { foreignKey: 'id_evento', as: 'evento' });

Empresa.belongsTo(Pais, { foreignKey: 'id_pais', as: 'pais' });
Empresa.belongsTo(Ciudad, { foreignKey: 'id_ciudad', as: 'ciudad' });

Pais.hasMany(Empresa, { foreignKey: 'id_pais', as: 'empresas' });
Ciudad.hasMany(Empresa, { foreignKey: 'id_ciudad', as: 'empresas' });

Empresa.belongsTo(Usuario, { foreignKey: 'id_creador', as: 'creador' });
Usuario.hasMany(Empresa, { foreignKey: 'id_creador', as: 'empresasCreadas' });


// Relaciones con Evento
Evento.belongsTo(Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
Evento.belongsTo(Usuario, { foreignKey: 'id_creador', as: 'creador' });

// Relaciones inversas
Empresa.hasMany(Evento, { foreignKey: 'id_empresa', as: 'eventos' });
Usuario.hasMany(Evento, { foreignKey: 'id_creador', as: 'eventosCreados' });


const db = {
  sequelize,
  Sequelize: require('sequelize'),
  Usuario,
  Administrador,
  Asistente,
  Ponente,
  Empresa,
  AdministradorEmpresa,
  Pais,
  Ciudad,
  Ubicacion,
  Lugar,
  Evento,
  Actividad,
  LugarActividad,
  PonenteActividad,
  Inscripcion,
  Asistencia,
  TipoNotificacion,
  Notificacion,
  Auditoria
};

module.exports = db;
