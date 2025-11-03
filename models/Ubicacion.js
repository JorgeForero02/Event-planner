const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ubicacion = sequelize.define('Ubicacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_empresa: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Empresa',
      key: 'id'
    }
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
    allowNull: false,
    references: {
      model: 'Ciudad',
      key: 'id'
    }
  }
}, {
  tableName: 'Ubicacion',
  timestamps: false
});

module.exports = Ubicacion;
