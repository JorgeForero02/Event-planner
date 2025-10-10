const { body } = require('express-validator');

const usuarioValidator = {
  create: [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('cedula').notEmpty().withMessage('La cédula es requerida'),
    body('correo').isEmail().withMessage('Email inválido'),
    body('contraseña').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres')
  ],
  update: [
    body('correo').optional().isEmail().withMessage('Email inválido')
  ]
};

module.exports = usuarioValidator;
