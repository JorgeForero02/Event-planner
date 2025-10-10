const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Actividad = sequelize.define('Actividad', {
  id_actividad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: false
  },
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fecha_actividad: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  id_evento: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Actividad',
  timestamps: false
});

module.exports = Actividad;
