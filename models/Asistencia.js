const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asistencia = sequelize.define('Asistencia', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  inscripcion: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Asistencia',
  timestamps: false
});

module.exports = Asistencia;
