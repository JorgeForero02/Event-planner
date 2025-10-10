const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ubicacion = sequelize.define('Ubicacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lugar: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  direccion: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  capacidad: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  id_ciudad: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Ubicacion',
  timestamps: false
});

module.exports = Ubicacion;
