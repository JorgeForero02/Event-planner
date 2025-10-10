const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PonenteActividad = sequelize.define('PonenteActividad', {
  id_ponente: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  id_actividad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  }
}, {
  tableName: 'Ponente_Actividad',
  timestamps: false
});

module.exports = PonenteActividad;
