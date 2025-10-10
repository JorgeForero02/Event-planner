const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evento = sequelize.define('Evento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  modalidad: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cupos: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_fin: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  estado: {
    type: DataTypes.TINYINT,
    defaultValue: 1
  }
}, {
  tableName: 'Evento',
  timestamps: false
});

module.exports = Evento;
