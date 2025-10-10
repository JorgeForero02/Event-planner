const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lugar = sequelize.define('Lugar', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_ubicacion: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'Lugar',
  timestamps: false
});

module.exports = Lugar;
